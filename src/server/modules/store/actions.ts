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

import { streamFileToDisk, cleanupTempFile } from "@/server/common/file-storage";
import { processImage } from "@/server/modules/products/lib/image-processor";
import { uploadImage } from "@/server/modules/products/s3client";

async function processAndUploadStoreImage(
  file: File,
  prefix: "store-profile" | "store-banner",
  dimensions: { width: number; height: number }
): Promise<string> {
  const streamed = await streamFileToDisk(file, prefix);
  try {
    const processed = await processImage(streamed.filePath, dimensions);
    if (!processed || !("buffer" in processed) || !processed.buffer) {
      throw new Error("Falha ao processar e otimizar a imagem.");
    }
    return await uploadImage(processed.buffer, prefix, "image/webp");
  } finally {
    await cleanupTempFile(streamed.filePath);
  }
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

  const profileImage = formData.get("profileImage") as File | null;
  const bannerImage = formData.get("bannerImage") as File | null;

  if (profileImage && profileImage.size > 0) {
    try {
      updateData.profileUrl = await processAndUploadStoreImage(
        profileImage,
        "store-profile",
        { width: 800, height: 800 }
      );
    } catch (err: any) {
      return { success: false, error: err.message || "Erro no upload da foto de perfil." };
    }
  }

  if (bannerImage && bannerImage.size > 0) {
    try {
      updateData.bannerUrl = await processAndUploadStoreImage(
        bannerImage,
        "store-banner",
        { width: 1200, height: 400 }
      );
    } catch (err: any) {
      return { success: false, error: err.message || "Erro no upload do banner." };
    }
  }

  let updatedStore;
  try {
    updatedStore = await updateStoreCustomization(session.user.id, updateData);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao salvar a personalização.",
    };
  }

  revalidatePath("/lojista/dashboard/personalizacao");
  revalidatePath("/lojista/minha-loja/personalizacao");
  revalidatePath("/lojista/minha-loja");
  if (updatedStore.slug) {
    revalidatePath(`/${updatedStore.slug}`);
  }
  return {
    success: true,
    message: "Personalização salva com sucesso!",
    profileUrl: updatedStore.profileUrl,
    bannerUrl: updatedStore.bannerUrl,
  };
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

