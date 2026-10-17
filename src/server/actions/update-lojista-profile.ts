"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { stores, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkOpenPixKey, PixKeyCheckResult } from "@/server/modules/payments/openpix";
import { redis } from "@/lib/redis";

/**
 * Server Action para validação de chave Pix com Rate Limit no Redis
 * Limite: Máximo 5 consultas de validação a cada 10 minutos por lojista para proteger contra varredura/bloqueio DICT
 */
export async function validatePixKeyAction(pixKey: string): Promise<PixKeyCheckResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { valid: false, error: "Não autorizado." };
  }

  const cleanKey = pixKey?.trim();
  if (!cleanKey) {
    return { valid: false, error: "Informe uma chave Pix para validar." };
  }

  // Rate Limiting no Redis por usuário
  const rateLimitKey = `rate-limit:pix-check:${session.user.id}`;
  const currentAttempts = await redis.incr(rateLimitKey);

  if (currentAttempts === 1) {
    // Expira em 10 minutos (600 segundos)
    await redis.expire(rateLimitKey, 600);
  }

  const MAX_ATTEMPTS = 5;
  if (currentAttempts > MAX_ATTEMPTS) {
    const ttl = await redis.ttl(rateLimitKey);
    const minutesLeft = Math.ceil(ttl / 60);
    return {
      valid: false,
      error: `Limite de validações atingido (${MAX_ATTEMPTS} tentativas). Aguarde ${minutesLeft} minutos para tentar novamente.`,
    };
  }

  return await checkOpenPixKey(cleanKey);
}

const updateProfileSchema = z.object({
  storeName: z.string().min(2, "O nome da loja deve ter pelo menos 2 caracteres."),
  slug: z.string().min(2, "O slug deve ter pelo menos 2 caracteres.")
    .regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hifens."),
  pixKey: z.string().optional(),
  userName: z.string().min(2, "O seu nome deve ter pelo menos 2 caracteres."),
  businessHours: z.string().optional(),
  manualIsOpen: z.enum(["auto", "open", "closed"]).optional(),
});

export async function updateLojistaProfile(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "LOJISTA") {
      return { error: "Não autorizado." };
    }

    const data = {
      storeName: formData.get("storeName") as string,
      slug: formData.get("slug") as string,
      pixKey: formData.get("pixKey") as string,
      userName: formData.get("userName") as string,
      businessHours: formData.get("businessHours") as string,
      manualIsOpen: formData.get("manualIsOpen") as string,
    };

    const parsed = updateProfileSchema.safeParse(data);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Dados inválidos." };
    }

    const { storeName, slug, pixKey, userName, businessHours, manualIsOpen } = parsed.data;

    let parsedBusinessHours = null;
    if (businessHours) {
      try {
        parsedBusinessHours = JSON.parse(businessHours);
      } catch (e) {
        return { error: "Formato de horário de funcionamento inválido." };
      }
    }

    const store = await db.query.stores.findFirst({
      where: eq(stores.userId, session.user.id),
    });

    if (!store) {
      return { error: "Loja não encontrada." };
    }

    // Verificar se o slug já está em uso por outra loja
    if (slug !== store.slug) {
      const existingStore = await db.query.stores.findFirst({
        where: eq(stores.slug, slug),
      });

      if (existingStore) {
        return { error: "Este slug (link) já está em uso. Escolha outro." };
      }
    }

    let finalManualIsOpen: boolean | null | undefined = undefined;
    if (manualIsOpen === "open") finalManualIsOpen = true;
    else if (manualIsOpen === "closed") finalManualIsOpen = false;
    else if (manualIsOpen === "auto") finalManualIsOpen = null;

    // Atualizar Loja
    const updateStoreFields: any = {
      name: storeName,
      slug: slug,
      pixKey: pixKey || null,
      businessHours: parsedBusinessHours,
      updatedAt: new Date(),
    };

    if (finalManualIsOpen !== undefined) {
      updateStoreFields.manualIsOpen = finalManualIsOpen;
    }

    await db.update(stores)
      .set(updateStoreFields)
      .where(eq(stores.id, store.id));

    // Atualizar Usuário
    if (userName !== session.user.name) {
      await db.update(user)
        .set({
          name: userName,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
    }

    revalidatePath("/lojista/minha-loja");
    revalidatePath("/lojista/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { error: "Erro interno ao atualizar perfil." };
  }
}
