import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const autoCompletionQueue = new Queue("auto-completion", { connection: redis });

/**
 * Registra o cronjob que roda todos os dias às 04:00 da manhã
 * para concluir automaticamente pedidos que foram despachados/prontos no dia anterior
 */
export async function startAutoCompletionCron() {
  await autoCompletionQueue.upsertJobScheduler(
    'auto-complete-orders-cron',
    { pattern: '0 4 * * *' }, // Todos os dias às 04:00 da manhã
    {
      name: 'auto-complete-orders',
      data: {},
    }
  );
  console.log("⏱️  Cron de Auto-Conclusão de pedidos agendado (04:00 da manhã).");
}
