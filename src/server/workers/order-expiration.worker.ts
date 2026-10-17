import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cancelOrderAndRestoreStock } from "../modules/orders/stock-services";
import { ORDER_EXPIRATION_QUEUE_NAME, OrderExpirationPayload } from "../queues/order-expiration.queue";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("worker:order-expiration");

export const orderExpirationWorker = new Worker<OrderExpirationPayload>(
  ORDER_EXPIRATION_QUEUE_NAME,
  async (job) => {
    const { orderId } = job.data;
    log.info({ orderId }, "Verificando expiração de pedido...");

    // 1. Busca o status atual do pedido no banco
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, storeId: true, status: true, cartType: true },
    });

    if (!orderRecord) {
      log.warn({ orderId }, "Pedido não encontrado para expiração");
      return;
    }

    // Se o pedido já foi pago ou cancelado manualmente, não faz nada
    if (orderRecord.status !== "PENDING_PAYMENT") {
      log.info({ orderId, status: orderRecord.status }, "Pedido já não está mais pendente de pagamento. Expiração ignorada.");
      return;
    }

    log.info({ orderId }, "Pedido excedeu janela de tolerância (16 min). Cancelando e restaurando estoque proativamente...");

    // 2. Cancela pedido e devolve estoque atomicamente
    await db.transaction(async (tx) => {
      const cancelResult = await cancelOrderAndRestoreStock(orderId, tx);

      if (!cancelResult.alreadyCanceled) {
        // Marca o pagamento associado como EXPIRED
        await tx
          .update(payments)
          .set({ status: "EXPIRED", updatedAt: new Date() })
          .where(
            and(
              eq(payments.orderId, orderId),
              eq(payments.status, "WAITING_PAYMENT")
            )
          );
      }
    });

    // 3. Notifica via SSE o painel do lojista e a tela do cliente
    await redis.publish(
      `store-orders:${orderRecord.storeId}`,
      JSON.stringify({
        type: "REFRESH",
        orderId: orderRecord.id,
        cartType: orderRecord.cartType,
      })
    ).catch((err) => log.error({ err }, "Erro ao publicar SSE para lojista"));

    await redis.publish(
      `order:${orderRecord.id}:events`,
      JSON.stringify({
        event: "ORDER_EXPIRED",
        orderId: orderRecord.id,
        status: "CANCELED",
      })
    ).catch((err) => log.error({ err }, "Erro ao publicar SSE para cliente"));

    log.info({ orderId }, "Pedido cancelado e estoque restaurado com sucesso pelo BullMQ.");
  },
  {
    connection: redis,
    concurrency: 5, // Processa até 5 expirações simultâneas
  }
);

orderExpirationWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "Falha no worker de expiração de pedidos");
});
