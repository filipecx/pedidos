import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const outboxQueue = new Queue("outbox-relay", { connection: redis });

/**
 * Registra o cronjob que ficará varrendo a tabela de outbox 
 * para garantir a entrega dos eventos (Self-Healing).
 */
export async function startOutboxRelayCron() {
  await outboxQueue.add(
    "flush-outbox", 
    {},
    {
      repeat: {
        every: 10000 // A cada 10 segundos
      },
      jobId: 'flush-outbox-cron' // Evita que múltiplos jobs com o mesmo nome sejam agendados
    }
  );
  console.log("⏱️  Cron do Outbox Relay agendado (10s).");
}
