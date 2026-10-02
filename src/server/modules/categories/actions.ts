"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { 
  createCategorySchema, 
  updateCategorySchema, 
  reorderCategoriesSchema 
} from "./schema";
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  reorderCategories 
} from "./services";

export async function createCategoryAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  const data = Object.fromEntries(formData.entries());
  const parsed = createCategorySchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createCategory(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/dashboard/categorias");
  return { success: true, message: "Categoria criada com sucesso!" };
}

export async function updateCategoryAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  const data = Object.fromEntries(formData.entries());
  const parsed = updateCategorySchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { id, ...updateData } = parsed.data;
    await updateCategory(session.user.id, id, updateData);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/dashboard/categorias");
  return { success: true, message: "Categoria atualizada com sucesso!" };
}

export async function deleteCategoryAction(categoryId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  try {
    await deleteCategory(session.user.id, categoryId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/dashboard/categorias");
  return { success: true, message: "Categoria apagada." };
}

export async function reorderCategoriesAction(payload: { items: { id: string; displayOrder: number }[] }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = reorderCategoriesSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Dados de ordenação inválidos." };
  }

  try {
    await reorderCategories(session.user.id, parsed.data.items);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/dashboard/categorias");
  return { success: true, message: "Ordem atualizada." };
}
