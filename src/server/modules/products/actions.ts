"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createProductSchema, updateProductSchema } from "./schema";
import { createProduct, updateProduct, deleteProduct } from "./services";

export async function createProductAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  // Convertendo os dados do FormData para o formato esperado pelo Zod
  const rawData = Object.fromEntries(formData.entries());
  
  const dataToParse = {
    ...rawData,
    basePriceCents: parseInt(rawData.basePriceCents as string, 10),
    isActive: rawData.isActive === "true",
    isProntaEntrega: rawData.isProntaEntrega === "true",
    isEncomenda: rawData.isEncomenda === "true",
    stockQuantity: rawData.stockQuantity ? parseInt(rawData.stockQuantity as string, 10) : null,
    preparationTimeDays: rawData.preparationTimeDays ? parseInt(rawData.preparationTimeDays as string, 10) : null,
  };

  const parsed = createProductSchema.safeParse(dataToParse);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createProduct(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Produto criado com sucesso!" };
}

export async function updateProductAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  const rawData = Object.fromEntries(formData.entries());
  
  const dataToParse = {
    ...rawData,
    basePriceCents: parseInt(rawData.basePriceCents as string, 10),
    isActive: rawData.isActive === "true",
    isProntaEntrega: rawData.isProntaEntrega === "true",
    isEncomenda: rawData.isEncomenda === "true",
    stockQuantity: rawData.stockQuantity ? parseInt(rawData.stockQuantity as string, 10) : null,
    preparationTimeDays: rawData.preparationTimeDays ? parseInt(rawData.preparationTimeDays as string, 10) : null,
  };

  const parsed = updateProductSchema.safeParse(dataToParse);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProduct(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Produto atualizado com sucesso!" };
}

export async function deleteProductAction(productId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  try {
    await deleteProduct(session.user.id, productId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Produto apagado." };
}
