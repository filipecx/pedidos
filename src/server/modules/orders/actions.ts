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
import { headers } from "next/headers";

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
    // 1.2 Rate Limiting no Redis (Proteção contra travamento malicioso de estoque / spam de cobranças Pix)
    if (typeof (redis as any).incr === "function") {
      let clientIdentifier = data.customerPhone;
      try {
        const reqHeaders = await headers();
        const forwardedFor = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
        const realIp = reqHeaders.get("x-real-ip")?.trim();
        if (forwardedFor || realIp) {
          clientIdentifier = `${forwardedFor || realIp}:${data.storeId}`;
        }
      } catch {
        // Fallback para telefone quando executado fora de contexto HTTP (ex: testes integrados)
      }

      const rateLimitKey = `rate-limit:checkout:${clientIdentifier}`;
      const attempts = await redis.incr(rateLimitKey).catch(() => 1);
      if (attempts === 1 && typeof (redis as any).expire === "function") {
        await redis.expire(rateLimitKey, 600).catch(() => {});
      }
      if (attempts > 8) {
        return {
          success: false,
          error: "Muitas tentativas de pedido em sequência. Aguarde alguns minutos antes de tentar novamente.",
        };
      }
    }

    // 1.5 Buscar a loja para informações de fee e split
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, data.storeId),
    });

    if (!store || store.isActive === false) {
      return { success: false, error: "Esta loja não está disponível para pedidos no momento." };
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

    // Trava de Segurança: Verificar se a modalidade escolhida (DELIVERY ou PICKUP) é aceita pela loja
    const allowedDeliveryMethods =
      store.businessHours?.deliveryMethods && store.businessHours.deliveryMethods.length > 0
        ? store.businessHours.deliveryMethods
        : ["PICKUP", "DELIVERY"];

    if (!allowedDeliveryMethods.includes(data.deliveryMethod)) {
      return {
        success: false,
        error:
          data.deliveryMethod === "DELIVERY"
            ? "Esta loja aceita apenas pedidos para retirada no local."
            : "Esta loja aceita apenas pedidos para entrega.",
      };
    }

    // 2. Buscar os produtos reais no banco garantindo isolamento Multi-Tenant (storeId) e status ativo (isActive)
    const uniqueProductIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const dbProducts = await db.query.products.findMany({
      where: and(
        inArray(productsSchema.id, uniqueProductIds),
        eq(productsSchema.storeId, data.storeId),
        eq(productsSchema.isActive, true)
      ),
    });

    if (dbProducts.length !== uniqueProductIds.length) {
      return { success: false, error: "Alguns produtos não estão mais disponíveis." };
    }

    // 2.05 Garantir que todos os produtos suportam a modalidade escolhida (pronta_entrega vs encomenda)
    const invalidModalityProduct = dbProducts.find((p) =>
      data.cartType === "pronta_entrega" ? p.isProntaEntrega === false : p.isEncomenda === false
    );
    if (invalidModalityProduct) {
      return {
        success: false,
        error: `O produto "${invalidModalityProduct.name}" não está disponível na modalidade selecionada.`,
      };
    }

    // 2.1 Se for encomenda, validar antecedência mínima de produção (preparationTimeDays)
    if (data.cartType === "encomenda" && data.scheduledTime) {
      const maxPrepDays = Math.max(
        0,
        ...dbProducts.map((p: any) => Number(p.preparationTimeDays || 0))
      );
      if (maxPrepDays > 0) {
        const minDate = new Date();
        minDate.setHours(0, 0, 0, 0);
        minDate.setDate(minDate.getDate() + maxPrepDays);

        const scheduledDate = new Date(data.scheduledTime);
        if (scheduledDate < minDate) {
          return {
            success: false,
            error: `Este pedido requer pelo menos ${maxPrepDays} ${
              maxPrepDays === 1 ? "dia" : "dias"
            } de antecedência para preparo.`,
          };
        }
      }
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
        notes: item.notes?.trim() || null,
      };
    });

    const deliveryFeeCents = 0;
    let totalCents = subtotalCents;

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
        // Ordenação determinística por productId para prevenir Deadlocks (Lock Ordering)
        // quando múltiplos clientes compram os mesmos itens em ordens invertidas.
        const sortedItems = [...itemsToInsert].sort((a, b) =>
          a.productId.localeCompare(b.productId)
        );

        for (const item of sortedItems) {
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
    if (error?.message && error.message.includes("Estoque insuficiente")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro interno ao processar pedido." };
  }
}

/**
 * Busca pública e segura para o cliente acompanhar seu pedido ativo na vitrine
 * ou recuperar o QR Code Pix caso tenha atualizado/fechado a página.
 */
export async function getPublicOrderTrackingAction(orderId: string) {
  if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return null;
  }

  try {
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!orderRecord) return null;

    const [items, payment, store] = await Promise.all([
      db.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderRecord.id),
      }),
      orderRecord.status === "PENDING_PAYMENT"
        ? db.query.payments.findFirst({
            where: eq(payments.orderId, orderRecord.id),
          })
        : Promise.resolve(null),
      db.query.stores.findFirst({
        where: eq(stores.id, orderRecord.storeId),
        columns: { name: true, slug: true, businessHours: true },
      }),
    ]);

    let maskedDeliveryAddress: { street: string; number: string; neighborhood: string } | null = null;
    if (orderRecord.deliveryAddress) {
      try {
        const rawAddr: any =
          typeof orderRecord.deliveryAddress === "string"
            ? JSON.parse(orderRecord.deliveryAddress)
            : orderRecord.deliveryAddress;
        if (rawAddr?.street && rawAddr?.neighborhood) {
          maskedDeliveryAddress = {
            street: rawAddr.street,
            number: "***",
            neighborhood: rawAddr.neighborhood,
          };
        }
      } catch {
        maskedDeliveryAddress = null;
      }
    }

    return {
      id: orderRecord.id,
      storeId: orderRecord.storeId,
      storeName: store?.name || "",
      pickupAddress: (store?.businessHours as any)?.pickupAddress || null,
      status: orderRecord.status,
      type: orderRecord.type,
      cartType: orderRecord.cartType,
      scheduledTime: orderRecord.scheduledTime,
      deliveryAddress: maskedDeliveryAddress,
      totalCents: orderRecord.totalCents,
      createdAt: orderRecord.createdAt,
      items: items.map((i) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        totalPriceCents: i.totalPriceCents,
        notes: i.notes,
      })),
      pixData:
        orderRecord.status === "PENDING_PAYMENT" && payment
          ? {
              brCode: payment.pixCopyPaste,
              qrCodeImage: payment.qrCodeUrl,
            }
          : null,
    };
  } catch (err) {
    console.error("[getPublicOrderTrackingAction] Erro:", err);
    return null;
  }
}
