import { db } from "@/db";
import { products, categories, stores } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

// ============================================================================
// CASOS DE USO (USE CASES)
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
  
  // Garante que o lojista é dono do produto que quer alterar
  await assertProductOwnership(data.id, store.id);
  
  // Garante que o lojista é dono da nova categoria escolhida
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
