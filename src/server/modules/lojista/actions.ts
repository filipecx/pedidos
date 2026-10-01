"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { registerLojistaSchema } from "./schema";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function registerLojistaAction(
  prevState: any,
  formData: FormData
) {
  const data = Object.fromEntries(formData.entries());
  
  // 1. O Zod atua como ACL (Anti-Corruption Layer)
  const parsed = registerLojistaSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // 2. Chamada à API interna do BetterAuth (Cria como CLIENTE por causa do middleware)
    const response = await auth.api.signUpEmail({
      headers: await headers(), 
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone,
      },
    });

    // 3. Promoção segura via Banco de Dados (Ambiente Backend Confiável)
    await db.update(user)
      .set({ role: "LOJISTA" })
      .where(eq(user.id, response.user.id));

    // 4. Aqui entra a Mágica do BullMQ! 🚀
    // Adicionamos a tarefa na fila (assíncrono, não trava a resposta pro usuário)
    const { emailQueue } = await import("@/server/queues/email.queue");
    await emailQueue.add("send-welcome-email", {
      email: parsed.data.email,
      name: parsed.data.name,
    });

  } catch (error: any) {
    // O BetterAuth lança erros legíveis (ex: E-mail já existe)
    return {
      success: false,
      error: error.message || "Ocorreu um erro ao criar a conta de lojista.",
    };
  }

  // 3. Redirecionamento (SEMPRE fora do try-catch no Next.js App Router)
  redirect("/lojista/onboarding");
}
