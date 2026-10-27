import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { reconcilePayments } from "../modules/payments/jobs/reconcile-payments";

console.log("👷 Worker de Reconciliação iniciado. Aguardando Cron...");

export const reconciliationWorker = new Worker(
  "reconciliation",
  async (job) => {
    if (job.name === "reconcile-payments") {
      const result = await reconcilePayments();
      if (result.reconciled > 0) {
        console.log(`[Reconciliação] ${result.reconciled} pagamentos corrigidos (Self-Healing).`);
      }
      return result;
    }
  },
  { 
    connection: redis,
    concurrency: 1, // Não queremos que duas reconciliações rodem ao mesmo tempo
  }
);

reconciliationWorker.on("failed", (job, err) => {
  console.error(`❌ [Reconciliação] Falha no cronjob: ${err.message}`);
});
