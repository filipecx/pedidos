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
    isCombo: rawData.isCombo === "true",
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

  let newProductId: string;
  try {
    const created = await createProduct(session.user.id, parsed.data);
    newProductId = created.id;
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  revalidatePath("/lojista/combos");
  return { success: true, message: "Produto criado com sucesso!", productId: newProductId };
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
    isCombo: rawData.isCombo === "true",
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

// ============================================================================
// SERVER ACTIONS - MODIFIER GROUPS
// ============================================================================

import { 
  createModifierGroupSchema, 
  updateModifierGroupSchema, 
  createModifierItemSchema, 
  updateModifierItemSchema 
} from "./schema";

import { 
  createModifierGroup, 
  updateModifierGroup, 
  deleteModifierGroup,
  createModifierItem,
  updateModifierItem,
  deleteModifierItem
} from "./services";

export async function createModifierGroupAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  const rawData = Object.fromEntries(formData.entries());
  const dataToParse = {
    ...rawData,
    isRequired: rawData.isRequired === "true",
    minChoices: parseInt(rawData.minChoices as string, 10),
    maxChoices: parseInt(rawData.maxChoices as string, 10),
    displayOrder: parseInt(rawData.displayOrder as string, 10) || 0,
  };

  const parsed = createModifierGroupSchema.safeParse(dataToParse);
  if (!parsed.success) return { success: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  let newGroupId: string;
  try {
    const created = await createModifierGroup(session.user.id, parsed.data);
    newGroupId = created.id;
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Grupo criado!", groupId: newGroupId };
}

export async function updateModifierGroupAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  const rawData = Object.fromEntries(formData.entries());
  const dataToParse = {
    ...rawData,
    isRequired: rawData.isRequired === "true",
    minChoices: parseInt(rawData.minChoices as string, 10),
    maxChoices: parseInt(rawData.maxChoices as string, 10),
    displayOrder: parseInt(rawData.displayOrder as string, 10) || 0,
  };

  const parsed = updateModifierGroupSchema.safeParse(dataToParse);
  if (!parsed.success) return { success: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateModifierGroup(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Grupo atualizado!" };
}

export async function deleteModifierGroupAction(groupId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  try {
    await deleteModifierGroup(session.user.id, groupId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Grupo apagado." };
}

// ============================================================================
// SERVER ACTIONS - MODIFIER ITEMS
// ============================================================================

export async function createModifierItemAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  const rawData = Object.fromEntries(formData.entries());
  const dataToParse = {
    ...rawData,
    additionalPriceCents: parseInt(rawData.additionalPriceCents as string, 10) || 0,
    displayOrder: parseInt(rawData.displayOrder as string, 10) || 0,
    isActive: rawData.isActive !== "false", // default true
  };

  const parsed = createModifierItemSchema.safeParse(dataToParse);
  if (!parsed.success) return { success: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await createModifierItem(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Item adicionado!" };
}

export async function updateModifierItemAction(prevState: any, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  const rawData = Object.fromEntries(formData.entries());
  const dataToParse = {
    ...rawData,
    additionalPriceCents: parseInt(rawData.additionalPriceCents as string, 10) || 0,
    displayOrder: parseInt(rawData.displayOrder as string, 10) || 0,
    isActive: rawData.isActive !== "false",
  };

  const parsed = updateModifierItemSchema.safeParse(dataToParse);
  if (!parsed.success) return { success: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateModifierItem(session.user.id, parsed.data);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Item atualizado!" };
}

export async function deleteModifierItemAction(itemId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  try {
    await deleteModifierItem(session.user.id, itemId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/lojista/produtos");
  return { success: true, message: "Item apagado." };
}

// ============================================================================
// SERVER ACTIONS - FULL COMBO CREATOR
// ============================================================================

export type FullComboPayload = {
  categoryId?: string | null;
  name: string;
  description?: string;
  basePriceCents: number;
  imageUrl?: string;
  groups: {
    name: string;
    isRequired: boolean;
    minChoices: number;
    maxChoices: number;
    items: {
      name: string;
      additionalPriceCents: number;
    }[];
  }[];
};

export async function createFullComboAction(payload: FullComboPayload) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "LOJISTA") return { success: false, error: "Acesso negado." };

  try {
    // 1. Criar o Combo (Produto Base)
    const combo = await createProduct(session.user.id, {
      categoryId: payload.categoryId,
      name: payload.name,
      description: payload.description,
      basePriceCents: payload.basePriceCents,
      imageUrl: payload.imageUrl,
      isProntaEntrega: true, // Combos geralmente são feitos na hora (encomenda) ou pronta entrega, vamos deixar os dois true por padrão, ou apenas pronta entrega
      isEncomenda: false,
      isCombo: true, 
      isActive: true,
    });

    // 2. Criar os Grupos e Itens sequencialmente
    let groupOrder = 10;
    for (const group of payload.groups) {
      const createdGroup = await createModifierGroup(session.user.id, {
        productId: combo.id,
        name: group.name,
        isRequired: group.isRequired,
        minChoices: group.minChoices,
        maxChoices: group.maxChoices,
        displayOrder: groupOrder,
      });
      groupOrder += 10;

      let itemOrder = 10;
      for (const item of group.items) {
        await createModifierItem(session.user.id, {
          groupId: createdGroup.id,
          name: item.name,
          additionalPriceCents: item.additionalPriceCents,
          displayOrder: itemOrder,
          isActive: true,
        });
        itemOrder += 10;
      }
    }

    revalidatePath("/lojista/combos");
    return { success: true, message: "Combo salvo com sucesso!", comboId: combo.id };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
