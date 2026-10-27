import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const reconciliationQueue = new Queue("reconciliation", { connection: redis });

/**
 * Registra o cronjob que varre os pagamentos pendentes no banco
 * e consulta a OpenPix para confirmar se já não foram pagos.
 */
export async function startReconciliationCron() {
  await reconciliationQueue.upsertJobScheduler(
    'reconcile-payments-cron',
    { every: 15 * 60 * 1000 }, // A cada 15 minutos
    {
      name: 'reconcile-payments',
      data: {},
    }
  );
  console.log("⏱️  Cron de Reconciliação agendado (15 min).");
}
