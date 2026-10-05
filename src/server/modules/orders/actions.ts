"use server";

import { db } from "@/db";
import { orders, orderItems, payments } from "@/db/schema";
import { products as productsSchema } from "@/db/schema";
import { checkoutSchema, CheckoutInput } from "./schema";
import { inArray, eq } from "drizzle-orm";
import { createOpenPixCharge } from "../payments/openpix";
import crypto from "crypto";

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
      const unitPriceCents = product.priceCents;
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
    const totalCents = subtotalCents + deliveryFeeCents;

    const idempotencyKey = crypto.randomUUID();

    // 4. TRANSAÇÃO DB (Fase 1: Criar Pedido e Pagamento INIT)
    const { orderId, paymentId } = await db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values({
        storeId: data.storeId,
        type: data.deliveryMethod,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
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
    let charge;
    try {
      const chargeOutput = await createOpenPixCharge({
        correlationID: idempotencyKey,
        value: totalCents,
        comment: `Pedido #${orderId.split("-")[0]} - ${data.customerName}`,
        customer: {
          name: data.customerName,
          phone: data.customerPhone,
        },
      });
      charge = chargeOutput.charge;
    } catch (pspError) {
      console.error("[Checkout] Falha na OpenPix:", pspError);
      // Se falhar a rede, marcamos como FAILED e o usuário pode tentar de novo depois
      await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, paymentId));
      return { success: false, error: "Serviço de pagamento indisponível no momento. Tente novamente." };
    }

    // 6. Atualiza o pagamento com os dados do Pix recebidos
    await db.update(payments).set({
      status: "WAITING_PAYMENT",
      pspReferenceId: charge.correlationID,
      brCode: charge.brCode,
      qrCodeUrl: charge.qrCodeImage,
    }).where(eq(payments.id, paymentId));

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
