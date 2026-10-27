import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import type { WelcomeEmailPayload, PasswordResetEmailPayload } from "../queues/email.queue";

import { handleWelcomeEmail } from "@/server/modules/lojista/jobs/send-welcome-email";
import { handlePasswordResetEmail } from "@/server/modules/auth/jobs/send-password-reset-email";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("email-worker");

log.info("👷 Worker de E-mails iniciado. Aguardando tarefas...");

// 1. Instanciamos o Worker apontando para a fila "emails"
export const emailWorker = new Worker(
  "emails",
  async (job) => {
    // 2. O Worker atua apenas como Roteador (Delega a função)
    const { name, data } = job;
    
    if (name === "send-welcome-email") {
      return await handleWelcomeEmail(data as WelcomeEmailPayload);
    } else if (name === "password-reset") {
      return await handlePasswordResetEmail(data as PasswordResetEmailPayload);
    }
  },
  { 
    connection: redis,
    concurrency: 5, // Pode processar até 5 e-mails ao mesmo tempo
  }
);

// Eventos de observabilidade do Worker
emailWorker.on("completed", (job) => {
  log.info({ jobId: job.id, jobName: job.name }, "✅ Job processado com sucesso");
});

emailWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, jobName: job?.name, error: err.message }, "❌ Job falhou");
});

