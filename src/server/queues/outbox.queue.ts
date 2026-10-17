import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const outboxQueue = new Queue("outbox-relay", { connection: redis });

/**
 * Registra o cronjob que ficará varrendo a tabela de outbox 
 * para garantir a entrega dos eventos (Self-Healing).
 */
export async function startOutboxRelayCron() {
  await outboxQueue.upsertJobScheduler(
    'flush-outbox-cron',
    { every: 10000 }, // A cada 10 segundos
    {
      name: 'flush-outbox',
      data: {},
    }
  );
  console.log("⏱️  Cron do Outbox Relay agendado (10s).");
}
