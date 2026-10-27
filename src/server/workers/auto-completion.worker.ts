import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("worker:auto-completion");

export const autoCompletionWorker = new Worker(
  "auto-completion",
  async (job) => {
    if (job.name === "auto-complete-orders") {
      log.info("⏰ Iniciando rotina das 04:00: Auto-conclusão de pedidos despachados/prontos pendentes...");

      // Busca todos os pedidos que ficaram com status READY ou DISPATCHED (despachados ou prontos no balcão)
      const pendingOrders = await db.query.orders.findMany({
        where: inArray(orders.status, ["READY", "DISPATCHED"]),
        columns: { id: true, storeId: true },
      });

      if (pendingOrders.length === 0) {
        log.info("Nenhum pedido pendente de conclusão encontrado.");
        return { completed: 0 };
      }

      const ids = pendingOrders.map((o) => o.id);

      await db
        .update(orders)
        .set({
          status: "DELIVERED",
          completionNotes: "Concluído automaticamente pelo sistema às 04:00",
          updatedAt: new Date(),
        })
        .where(inArray(orders.id, ids));

      log.info({ count: ids.length }, `✅ ${ids.length} pedidos foram concluídos automaticamente pelo sistema.`);

      // Notifica as lojas afetadas para atualizarem suas interfaces caso alguém esteja logado
      const storeIds = Array.from(new Set(pendingOrders.map((o) => o.storeId)));
      for (const storeId of storeIds) {
        await redis
          .publish(`store-orders:${storeId}`, JSON.stringify({ type: "REFRESH" }))
          .catch((err) => log.error({ err, storeId }, "Erro ao emitir SSE para loja"));
      }

      return { completed: ids.length };
    }
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

autoCompletionWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "Falha no cronjob de auto-conclusão de pedidos");
});
