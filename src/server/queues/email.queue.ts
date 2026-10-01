import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

// 1. Instanciamos a nossa Fila. O nome "emails" é o identificador dela dentro do Redis.
export const emailQueue = new Queue("emails", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Se falhar (ex: a API do SendGrid cair), tenta de novo mais 2 vezes
    backoff: {
      type: "exponential",
      delay: 5000, // Espera 5s, depois 25s, depois 125s entre as tentativas
    },
    removeOnComplete: true, // Mantém o Redis limpo apagando jobs que deram certo
  },
});

// Tipagem para ajudar no autocomplete quando formos adicionar um job
export interface WelcomeEmailPayload {
  email: string;
  name: string;
}
