import type { WelcomeEmailPayload } from "@/server/queues/email.queue";

/**
 * Handler responsável por disparar o e-mail de boas vindas.
 * No futuro, integraremos com o SDK do Resend ou AWS SES aqui.
 */
export async function handleWelcomeEmail(payload: WelcomeEmailPayload) {
  console.log(`\n✉️  [PROCESSANDO] Preparando para enviar e-mail para ${payload.name} (${payload.email})`);
  
  // Simulação da chamada da API externa (Delay de 2s)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  console.log(`✅ [CONCLUÍDO] E-mail enviado com sucesso para ${payload.email}!`);
  
  return { 
    status: "sent", 
    deliveredTo: payload.email,
    timestamp: new Date().toISOString() 
  };
}
