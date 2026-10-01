import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import type { WelcomeEmailPayload } from "../queues/email.queue";

import { handleWelcomeEmail } from "@/server/modules/lojista/jobs/send-welcome-email";

console.log("👷 Worker de E-mails iniciado. Aguardando tarefas...");

// 1. Instanciamos o Worker apontando para a fila "emails"
export const emailWorker = new Worker(
  "emails",
  async (job) => {
    // 2. O Worker atua apenas como Roteador (Delega a função)
    const { name, data } = job;
    
    if (name === "send-welcome-email") {
      return await handleWelcomeEmail(data as WelcomeEmailPayload);
    }
    
    // Futuras rotas de jobs entram aqui:
    // else if (name === "password-reset") { return await handlePasswordReset(...) }
  },
  { 
    connection: redis,
    concurrency: 5, // Pode processar até 5 e-mails ao mesmo tempo
  }
);

// Tratamento de erros pro nosso console ficar limpo
emailWorker.on("failed", (job, err) => {
  console.error(`❌ [FALHOU] O job ${job?.id} falhou com o erro: ${err.message}`);
});
