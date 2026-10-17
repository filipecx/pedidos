"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createStoreSchema, updateCustomizationSchema, updateManualStatusSchema } from "./schema";
import { createStore, updateStoreCustomization, updateStoreManualStatus } from "./services";
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

import { imageQueue } from "@/server/queues/image.queue";

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

  const updateData: any = {
    themeColors: {
      primary: parsed.data.colorPrimary || "#8b5cf6",
      background: parsed.data.colorBackground || "#ffffff",
      text: parsed.data.colorText || "#111827",
    },
    layoutConfig: {
      productView: parsed.data.productView || "list",
      categoryPosition: parsed.data.categoryPosition || "top",
      defaultTab: parsed.data.defaultTab || "pronta_entrega",
    },
  };

  let updatedStore;
  try {
    updatedStore = await updateStoreCustomization(session.user.id, updateData);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao salvar a personalização.",
    };
  }

  const profileImage = formData.get("profileImage") as File | null;
  const bannerImage = formData.get("bannerImage") as File | null;

  if (profileImage && profileImage.size > 0) {
    const arrayBuffer = await profileImage.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    await imageQueue.add("process-image", {
      targetType: "store-profile",
      targetId: updatedStore.id,
      bufferBase64: base64,
      fileName: `profile-${updatedStore.id}`,
    });
  }

  if (bannerImage && bannerImage.size > 0) {
    const arrayBuffer = await bannerImage.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    await imageQueue.add("process-image", {
      targetType: "store-banner",
      targetId: updatedStore.id,
      bufferBase64: base64,
      fileName: `banner-${updatedStore.id}`,
    });
  }

  revalidatePath("/lojista/dashboard/personalizacao");
  revalidatePath("/lojista/minha-loja/personalizacao");
  return { success: true, message: "Personalização salva com sucesso!" };
}

export async function updateStoreManualStatusAction(manualIsOpen: boolean | null) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return {
      success: false,
      error: "Acesso negado. Faça login para continuar.",
    };
  }

  const parsed = updateManualStatusSchema.safeParse({ manualIsOpen });
  if (!parsed.success) {
    return {
      success: false,
      error: "Parâmetro de status inválido.",
    };
  }

  try {
    const updatedStore = await updateStoreManualStatus(session.user.id, parsed.data.manualIsOpen);
    revalidatePath("/lojista/dashboard");
    revalidatePath("/lojista/minha-loja");
    revalidatePath("/lojista/pedidos");
    if (updatedStore.slug) {
      revalidatePath(`/${updatedStore.slug}`);
    }
    return {
      success: true,
      manualIsOpen: updatedStore.manualIsOpen,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao alterar o status da loja.",
    };
  }
}

