import type { PasswordResetEmailPayload } from "@/server/queues/email.queue";

export async function handlePasswordResetEmail(data: PasswordResetEmailPayload) {
  // Num cenário real, aqui seria feita a chamada para Resend, AWS SES, ou SendGrid.
  // Como é um MVP / Teste, vamos só logar no terminal para fingir o envio!
  
  console.log("=========================================");
  console.log("📧 ENVIANDO E-MAIL DE REDEFINIÇÃO DE SENHA");
  console.log(`Para: ${data.email}`);
  console.log(`Link: ${data.url}`);
  console.log("=========================================");

  // Simula o tempo de chamada de uma API de e-mail (1 segundo)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return { success: true, messageId: `msg_${Date.now()}` };
}
