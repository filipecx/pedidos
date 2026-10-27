import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { flushOutbox } from "../modules/payments/jobs/flush-outbox";

console.log("👷 Worker do Outbox Relay iniciado. Aguardando Cron...");

export const outboxWorker = new Worker(
  "outbox-relay",
  async (job) => {
    if (job.name === "flush-outbox") {
      const result = await flushOutbox();
      if (result.processed > 0) {
        console.log(`[Outbox Relay] ${result.processed} eventos processados e entregues.`);
      }
      return result;
    }
  },
  { 
    connection: redis,
    concurrency: 1, // Impede que o cron rode processamento paralelo na tabela causando Race Conditions
  }
);

outboxWorker.on("failed", (job, err) => {
  console.error(`❌ [Outbox Relay] Falha no cronjob: ${err.message}`);
});
