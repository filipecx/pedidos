import { db } from "@/db";
import { categories, stores } from "@/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";

// ============================================================================
// VALIDAÇÕES DE DOMÍNIO (INVARIANTES)
// Funções reaproveitáveis que garantem o estado válido da aplicação.
// ============================================================================

/**
 * Garante que a loja do usuário existe e retorna seus dados.
 * Proteção contra IDOR e usuários sem loja.
 */
export async function assertStoreExists(userId: string) {
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, userId),
  });
  if (!store) {
    throw new Error("Vitrine não encontrada para este usuário.");
  }
  return store;
}

/**
 * Garante que a categoria existe e pertence EXCLUSIVAMENTE à loja informada.
 * Proteção contra Tenant-IDOR (tentar alterar dado de outra loja).
 */
export async function assertCategoryExists(categoryId: string, storeId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.storeId, storeId)),
  });
  if (!category) {
    throw new Error("Categoria não encontrada ou não pertence a sua loja.");
  }
  return category;
}

/**
 * Garante que o slug escolhido não colida com outro já existente na mesma loja.
 */
export async function assertSlugIsUnique(storeId: string, slug: string, excludeCategoryId?: string) {
  const conditions = [eq(categories.storeId, storeId), eq(categories.slug, slug)];
  
  if (excludeCategoryId) {
    conditions.push(ne(categories.id, excludeCategoryId));
  }

  const category = await db.query.categories.findFirst({
    where: and(...conditions),
  });
  
  if (category) {
    throw new Error("Já existe uma categoria com este link (slug). Escolha outro.");
  }
}

// ============================================================================
// CASOS DE USO (USE CASES)
// Ações principais do domínio orquestrando as validações acima.
// ============================================================================

export async function createCategory(userId: string, data: { name: string; slug: string; description?: string }) {
  // 1. Validações de Domínio
  const store = await assertStoreExists(userId);
  await assertSlugIsUnique(store.id, data.slug);

  // 2. Regra de Negócio: Incremento de Display Order
  const lastCategory = await db.query.categories.findFirst({
    where: eq(categories.storeId, store.id),
    orderBy: [desc(categories.displayOrder)],
  });

  const nextDisplayOrder = lastCategory ? lastCategory.displayOrder + 10 : 10;

  // 3. Mutação
  const [newCategory] = await db.insert(categories).values({
    storeId: store.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    displayOrder: nextDisplayOrder,
  }).returning();

  return newCategory;
}

export async function updateCategory(userId: string, categoryId: string, data: { name: string; slug: string; description?: string }) {
  const store = await assertStoreExists(userId);
  const category = await assertCategoryExists(categoryId, store.id);
  await assertSlugIsUnique(store.id, data.slug, category.id);

  const [updatedCategory] = await db.update(categories).set({
    name: data.name,
    slug: data.slug,
    description: data.description,
    updatedAt: new Date(),
  }).where(eq(categories.id, category.id)).returning();

  return updatedCategory;
}

export async function deleteCategory(userId: string, categoryId: string) {
  const store = await assertStoreExists(userId);
  const category = await assertCategoryExists(categoryId, store.id);

  await db.delete(categories).where(eq(categories.id, category.id));
}

export async function listCategories(userId: string) {
  const store = await assertStoreExists(userId);

  return db.query.categories.findMany({
    where: eq(categories.storeId, store.id),
    orderBy: (categories, { asc }) => [asc(categories.displayOrder)],
  });
}

export async function reorderCategories(userId: string, items: { id: string; displayOrder: number }[]) {
  const store = await assertStoreExists(userId);

  // O db.transaction garante que se uma falhar, todas as reordenações são desfeitas (Rollback)
  await db.transaction(async (tx) => {
    for (const item of items) {
      // Novamente usando a restrição do store.id direto na query por segurança extrema
      await tx.update(categories)
        .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
        .where(and(eq(categories.id, item.id), eq(categories.storeId, store.id)));
    }
  });
}
