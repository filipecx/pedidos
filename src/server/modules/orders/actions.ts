"use server";

import { db } from "@/db";
import { orders, orderItems, payments, stores } from "@/db/schema";
import { products as productsSchema } from "@/db/schema";
import { checkoutSchema, CheckoutInput } from "./schema";
import { inArray, eq, and, sql } from "drizzle-orm";
import { createOpenPixCharge } from "../payments/openpix";
import crypto from "crypto";
import { redis } from "@/lib/redis";
import { cancelOrderAndRestoreStock } from "./stock-services";
import { scheduleOrderExpiration } from "@/server/queues/order-expiration.queue";
import { isStoreOpenNow } from "../store/store-status";

export async function createOrderAction(payload: CheckoutInput) {
  // 1. Validação Anti-Corruption Layer via Zod
  const parsed = checkoutSchema.safeParse(payload);
  
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos no checkout",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    // 1.5 Buscar a loja para informações de fee e split
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, data.storeId),
    });

    if (!store) {
      return { success: false, error: "Loja não encontrada." };
    }

    // Trava de Segurança: A loja OBRIGATORIAMENTE deve ter uma chave Pix cadastrada para receber pagamentos
    if (!store.pixKey || store.pixKey.trim() === "") {
      return { 
        success: false, 
        error: "Esta vitrine ainda não configurou uma chave Pix para receber pagamentos. Entre em contato com o vendedor." 
      };
    }

    // Trava de Segurança: Verificar se a loja está aberta
    const isOpen = isStoreOpenNow(store.manualIsOpen, store.businessHours as any);
    if (!isOpen) {
      return {
        success: false,
        error: "A loja está fechada no momento e não está recebendo novos pedidos.",
      };
    }

    // 2. Buscar os produtos reais no banco (NUNCA confie nos preços do front-end)
    const productIds = data.items.map((i) => i.productId);
    const dbProducts = await db.query.products.findMany({
      where: inArray(productsSchema.id, productIds),
    });

    if (dbProducts.length !== productIds.length) {
      return { success: false, error: "Alguns produtos não estão mais disponíveis." };
    }

    // 3. Recalcular o total
    let subtotalCents = 0;
    const itemsToInsert = data.items.map((item) => {
      const product = dbProducts.find((p) => p.id === item.productId)!;
      const unitPriceCents = product.basePriceCents;
      const totalPriceCents = unitPriceCents * item.quantity;
      subtotalCents += totalPriceCents;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents,
        totalPriceCents,
        // modifiers poderiam ser somados aqui se adicionados no schema futuramente
      };
    });

    const deliveryFeeCents = data.deliveryMethod === "DELIVERY" ? 1000 : 0; // Fixo de R$10 por enquanto
    let totalCents = subtotalCents + deliveryFeeCents;

    if (store.passFeeToCustomer && store.transactionFeeCents > 0) {
      totalCents += store.transactionFeeCents;
    }

    // Calcula o split da plataforma (A OpenPix só aceita splits se split < total da cobrança)
    // Se a taxa for 0 (gratuito), não enviamos splits e o valor fica integral
    const hasPlatformFee = store.transactionFeeCents > 0;
    const merchantSplitValue = totalCents - store.transactionFeeCents;
    const splits = (store.pixKey && hasPlatformFee && merchantSplitValue > 0 && merchantSplitValue < totalCents)
      ? [
          {
            pixKey: store.pixKey,
            value: merchantSplitValue,
          },
        ]
      : undefined;

    const idempotencyKey = crypto.randomUUID();

    // 4. TRANSAÇÃO DB (Fase 1: Criar Pedido, Reservar Estoque de Pronta-Entrega e Pagamento INIT)
    const { orderId, paymentId } = await db.transaction(async (tx) => {
      // 4.1 Decrementa atomicamente o estoque para itens de pronta-entrega
      if (data.cartType === "pronta_entrega") {
        for (const item of itemsToInsert) {
          const product = dbProducts.find((p) => p.id === item.productId);
          if (product?.isProntaEntrega && product.stockQuantity !== null) {
            // Decremento atômico com verificação de estoque não negativo (evita race condition)
            const updated = await tx
              .update(productsSchema)
              .set({
                stockQuantity: sql`${productsSchema.stockQuantity} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(productsSchema.id, item.productId),
                  sql`${productsSchema.stockQuantity} >= ${item.quantity}`
                )
              )
              .returning({ id: productsSchema.id });

            if (updated.length === 0) {
              throw new Error(`Estoque insuficiente para o produto "${item.productName}".`);
            }
          }
        }
      }

      const [newOrder] = await tx.insert(orders).values({
        storeId: data.storeId,
        type: data.deliveryMethod,
        cartType: data.cartType,
        scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : undefined,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        status: "PENDING_PAYMENT",
      }).returning({ id: orders.id });

      const mappedItems = itemsToInsert.map(item => ({
        ...item,
        orderId: newOrder.id,
      }));
      await tx.insert(orderItems).values(mappedItems);

      const [newPayment] = await tx.insert(payments).values({
        orderId: newOrder.id,
        amountCents: totalCents,
        idempotencyKey,
        status: "INITIATED",
        pspProvider: "OPENPIX",
      }).returning({ id: payments.id });

      return { orderId: newOrder.id, paymentId: newPayment.id };
    });

    // 5. Chamada de Rede Externa (PSP) fora da Transação ACID para não travar o banco
    // Micro-retry: Tenta até 3 vezes em caso de falha de rede/timeout
    let charge;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const chargeOutput = await createOpenPixCharge({
          correlationID: idempotencyKey,
          value: totalCents,
          comment: `Pedido #${orderId.split("-")[0]} - ${data.customerName}`,
          customer: {
            name: data.customerName,
            phone: data.customerPhone,
          },
          splits: splits,
        });
        charge = chargeOutput.charge;
        break; // Sucesso, quebra o loop
      } catch (pspError) {
        attempt++;
        console.warn(`[Checkout] Falha na OpenPix (Tentativa ${attempt}/${maxAttempts})...`);
        
        if (attempt >= maxAttempts) {
          console.error("[Checkout] OpenPix indisponível após várias tentativas:", pspError);
          // Se falhar a rede em todas as tentativas, cancelamos o pedido e devolvemos o estoque reservado
          await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, paymentId));
          await cancelOrderAndRestoreStock(orderId);
          return { success: false, error: "Serviço de pagamento indisponível no momento. Tente novamente." };
        }
        
        // Backoff: Espera 1s na primeira falha, 2s na segunda, etc., antes de tentar de novo
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // 6. Atualiza o pagamento com os dados do Pix recebidos
    if (!charge) {
      return { success: false, error: "Falha ao gerar cobrança Pix." };
    }

    await db.update(payments).set({
      status: "WAITING_PAYMENT",
      pspReferenceId: charge.correlationID,
      pixCopyPaste: charge.brCode,
      qrCodeUrl: charge.qrCodeImage,
    }).where(eq(payments.id, paymentId));

    // 6.1 Agenda expiração proativa do pedido com tolerância (16 minutos) via BullMQ
    await scheduleOrderExpiration(orderId, 16 * 60 * 1000).catch((err) => {
      console.error("[Order Expiration Queue Error] Falha ao agendar job:", err);
    });

    // Avisa o painel do lojista via SSE com cartType
    await redis.publish(
      `store-orders:${data.storeId}`, 
      JSON.stringify({ 
        type: "REFRESH",
        orderId,
        cartType: data.cartType,
      })
    ).catch(e => console.error("SSE Publish Error", e));

    // 7. Retorna para o Frontend direcionar para a tela de Aguardando Pagamento
    return {
      success: true,
      message: "Pedido aguardando pagamento.",
      orderId,
      pixData: {
        brCode: charge.brCode,
        qrCodeImage: charge.qrCodeImage,
        expiresIn: charge.expiresIn,
      }
    };
  } catch (error: any) {
    console.error("[Checkout Action] Erro interno:", error);
    return { success: false, error: "Erro interno ao processar pedido." };
  }
}
