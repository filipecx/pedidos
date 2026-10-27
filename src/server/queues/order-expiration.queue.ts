import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const ORDER_EXPIRATION_QUEUE_NAME = "order-expiration";

export interface OrderExpirationPayload {
  orderId: string;
}

export const orderExpirationQueue = new Queue<OrderExpirationPayload>(
  ORDER_EXPIRATION_QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true, // Mantém o Redis limpo
      removeOnFail: false,    // Permite auditar falhas se houver
    },
  }
);

/**
 * Agenda a expiração proativa do pedido com delay em milissegundos
 * Padrão: 16 minutos (960.000 ms)
 */
export async function scheduleOrderExpiration(orderId: string, delayMs = 16 * 60 * 1000) {
  await orderExpirationQueue.add(
    "expire-order",
    { orderId },
    {
      delay: delayMs,
      jobId: `expire-${orderId}`, // Garante idempotência no Redis
    }
  );
}
