import { db } from "@/db";
import { products, categories, stores, productModifierGroups, productModifierItems } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============================================================================
// VALIDAÇÕES DE DOMÍNIO (INVARIANTES)
// ============================================================================

async function assertStoreExists(userId: string) {
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, userId),
  });
  if (!store) {
    throw new Error("Vitrine não encontrada para este usuário.");
  }
  return store;
}

/**
 * Garante que a Categoria existe e pertence à loja do Lojista.
 * Isso evita que um Lojista A crie um Produto vinculando à Categoria do Lojista B.
 */
async function assertCategoryOwnership(categoryId: string, storeId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.storeId, storeId)),
  });
  if (!category) {
    throw new Error("Categoria não encontrada ou não pertence a sua vitrine.");
  }
  return category;
}

/**
 * Garante que o Produto existe e pertence à loja do Lojista.
 */
async function assertProductOwnership(productId: string, storeId: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, storeId)),
  });
  if (!product) {
    throw new Error("Produto não encontrado ou não pertence a sua vitrine.");
  }
  return product;
}

/**
 * Garante que o Grupo de Modificadores existe e pertence a um produto da loja do Lojista.
 */
async function assertModifierGroupOwnership(groupId: string, storeId: string) {
  const group = await db.query.productModifierGroups.findFirst({
    where: eq(productModifierGroups.id, groupId),
    with: {
      product: true,
    }
  } as any); // cast temporário para o join
  
  // Como o drizzle "with" ainda não foi exportado corretamente nas relations neste escopo, vamos buscar manualmente para garantir segurança:
  const groupRaw = await db.query.productModifierGroups.findFirst({
    where: eq(productModifierGroups.id, groupId),
  });

  if (!groupRaw) throw new Error("Grupo não encontrado.");
  
  // Valida a propriedade do produto pai
  await assertProductOwnership(groupRaw.productId, storeId);
  return groupRaw;
}

// ============================================================================
// CASOS DE USO (USE CASES) - PRODUTOS
// ============================================================================

export type CreateProductInput = {
  categoryId: string;
  name: string;
  description?: string;
  basePriceCents: number;
  imageUrl?: string;
  isActive?: boolean;
  isProntaEntrega: boolean;
  isEncomenda: boolean;
  stockQuantity?: number | null;
  preparationTimeDays?: number | null;
};

export async function createProduct(userId: string, data: CreateProductInput) {
  const store = await assertStoreExists(userId);
  await assertCategoryOwnership(data.categoryId, store.id);

  const [newProduct] = await db.insert(products).values({
    storeId: store.id,
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    basePriceCents: data.basePriceCents,
    imageUrl: data.imageUrl || null,
    isActive: data.isActive ?? true,
    isProntaEntrega: data.isProntaEntrega,
    isEncomenda: data.isEncomenda,
    stockQuantity: data.isProntaEntrega ? data.stockQuantity : null,
    preparationTimeDays: data.isEncomenda ? data.preparationTimeDays : null,
  }).returning();

  return newProduct;
}

export type UpdateProductInput = CreateProductInput & { id: string };

export async function updateProduct(userId: string, data: UpdateProductInput) {
  const store = await assertStoreExists(userId);
  
  await assertProductOwnership(data.id, store.id);
  await assertCategoryOwnership(data.categoryId, store.id);

  const [updatedProduct] = await db.update(products).set({
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    basePriceCents: data.basePriceCents,
    imageUrl: data.imageUrl || null,
    isActive: data.isActive ?? true,
    isProntaEntrega: data.isProntaEntrega,
    isEncomenda: data.isEncomenda,
    stockQuantity: data.isProntaEntrega ? data.stockQuantity : null,
    preparationTimeDays: data.isEncomenda ? data.preparationTimeDays : null,
    updatedAt: new Date(),
  }).where(eq(products.id, data.id)).returning();

  return updatedProduct;
}

export async function deleteProduct(userId: string, productId: string) {
  const store = await assertStoreExists(userId);
  await assertProductOwnership(productId, store.id);

  await db.delete(products).where(eq(products.id, productId));
}

export async function listProducts(userId: string) {
  const store = await assertStoreExists(userId);

  return db.query.products.findMany({
    where: eq(products.storeId, store.id),
  });
}

// ============================================================================
// CASOS DE USO (USE CASES) - MODIFICADORES
// ============================================================================

export type CreateModifierGroupInput = {
  productId: string;
  name: string;
  isRequired: boolean;
  minChoices: number;
  maxChoices: number;
  displayOrder: number;
};

export async function createModifierGroup(userId: string, data: CreateModifierGroupInput) {
  const store = await assertStoreExists(userId);
  await assertProductOwnership(data.productId, store.id);

  const [newGroup] = await db.insert(productModifierGroups).values(data).returning();
  return newGroup;
}

export type UpdateModifierGroupInput = Omit<CreateModifierGroupInput, "productId"> & { id: string };

export async function updateModifierGroup(userId: string, data: UpdateModifierGroupInput) {
  const store = await assertStoreExists(userId);
  await assertModifierGroupOwnership(data.id, store.id);

  const [updatedGroup] = await db.update(productModifierGroups)
    .set({
      name: data.name,
      isRequired: data.isRequired,
      minChoices: data.minChoices,
      maxChoices: data.maxChoices,
      displayOrder: data.displayOrder,
      updatedAt: new Date(),
    })
    .where(eq(productModifierGroups.id, data.id))
    .returning();
    
  return updatedGroup;
}

export async function deleteModifierGroup(userId: string, groupId: string) {
  const store = await assertStoreExists(userId);
  await assertModifierGroupOwnership(groupId, store.id);

  await db.delete(productModifierGroups).where(eq(productModifierGroups.id, groupId));
}

export type CreateModifierItemInput = {
  groupId: string;
  name: string;
  additionalPriceCents: number;
  displayOrder: number;
  isActive: boolean;
};

export async function createModifierItem(userId: string, data: CreateModifierItemInput) {
  const store = await assertStoreExists(userId);
  await assertModifierGroupOwnership(data.groupId, store.id);

  const [newItem] = await db.insert(productModifierItems).values(data).returning();
  return newItem;
}

export type UpdateModifierItemInput = Omit<CreateModifierItemInput, "groupId"> & { id: string };

export async function updateModifierItem(userId: string, data: UpdateModifierItemInput) {
  const store = await assertStoreExists(userId);
  
  // Precisamos garantir que o item pertence a um grupo do usuário
  const itemRaw = await db.query.productModifierItems.findFirst({
    where: eq(productModifierItems.id, data.id)
  });
  if (!itemRaw) throw new Error("Item não encontrado.");
  
  await assertModifierGroupOwnership(itemRaw.groupId, store.id);

  const [updatedItem] = await db.update(productModifierItems)
    .set({
      name: data.name,
      additionalPriceCents: data.additionalPriceCents,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(productModifierItems.id, data.id))
    .returning();
    
  return updatedItem;
}

export async function deleteModifierItem(userId: string, itemId: string) {
  const store = await assertStoreExists(userId);
  
  const itemRaw = await db.query.productModifierItems.findFirst({
    where: eq(productModifierItems.id, itemId)
  });
  if (!itemRaw) return;
  
  await assertModifierGroupOwnership(itemRaw.groupId, store.id);
  await db.delete(productModifierItems).where(eq(productModifierItems.id, itemId));
}

export async function listModifiersForProduct(userId: string, productId: string) {
  const store = await assertStoreExists(userId);
  await assertProductOwnership(productId, store.id);

  // Busca todos os grupos desse produto
  const groups = await db.query.productModifierGroups.findMany({
    where: eq(productModifierGroups.productId, productId),
    orderBy: (groups, { asc }) => [asc(groups.displayOrder)],
  });

  if (groups.length === 0) return [];

  // Busca os itens desses grupos
  const groupIds = groups.map(g => g.id);
  // Em Drizzle puro, `inArray` requer import. Vamos importar.
  // Wait, I didn't import `inArray`. Let's just fetch all items and filter in memory, or use a loop for now (since it's a small dataset usually).
  // No, let's just fetch them:
  // I will just return the groups with their items joined manually or rely on Drizzle relations if they were defined (they are not).
  
  const allItems = await db.query.productModifierItems.findMany({
    where: (items, { inArray }) => inArray(items.groupId, groupIds),
    orderBy: (items, { asc }) => [asc(items.displayOrder)],
  });

  // Monta a estrutura aninhada
  return groups.map(g => ({
    ...g,
    items: allItems.filter(i => i.groupId === g.id)
  }));
}
