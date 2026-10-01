"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createStoreSchema, updateCustomizationSchema } from "./schema";
import { createStore, updateStoreCustomization } from "./services";
import { revalidatePath } from "next/cache";

/**
 * Server Action Orquestradora
 * Responsabilidade: Parse de HTTP/FormData, Autenticação, chamada do Domínio e UI State.
 */
export async function createStoreAction(
  prevState: any,
  formData: FormData
) {
  // 1. Auth Orchestration
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return {
      success: false,
      error: "Acesso negado. Apenas lojistas podem criar vitrines.",
    };
  }

  // 2. Data Validation (Anti-Corruption Layer)
  const data = Object.fromEntries(formData.entries());
  const parsed = createStoreSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Domain Logic Delegation
  try {
    await createStore(
      session.user.id, 
      parsed.data.name, 
      parsed.data.slug
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Ocorreu um erro interno ao criar sua vitrine.",
    };
  }

  // 4. Redirect Route
  redirect("/lojista/dashboard");
}

export async function updateStoreCustomizationAction(
  prevState: any,
  formData: FormData
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return {
      success: false,
      error: "Acesso negado. Faça login para continuar.",
    };
  }

  const data = Object.fromEntries(formData.entries());
  const parsed = updateCustomizationSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Verifique os campos preenchidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const updateData = {
    themeColors: {
      primary: parsed.data.colorPrimary || "#8b5cf6", // Default Tailwind violet-500
      background: parsed.data.colorBackground || "#ffffff",
      text: parsed.data.colorText || "#111827",
    },
    layoutConfig: {
      productView: parsed.data.productView || "list",
      categoryPosition: parsed.data.categoryPosition || "top",
    },
    bannerUrl: parsed.data.bannerUrl || null,
    profileUrl: parsed.data.profileUrl || null,
  };

  try {
    await updateStoreCustomization(session.user.id, updateData);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao salvar a personalização.",
    };
  }

  revalidatePath("/lojista/dashboard/personalizacao");
  return { success: true, message: "Personalização salva com sucesso!" };
}
