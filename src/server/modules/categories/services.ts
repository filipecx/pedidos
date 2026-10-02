import { db } from "@/db";
import { categories, stores } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getStoreByUserId(userId: string) {
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, userId),
  });
  if (!store) {
    throw new Error("Loja não encontrada para este usuário.");
  }
  return store;
}

export async function checkIfCategorySlugExists(storeId: string, slug: string, excludeCategoryId?: string) {
  const conditions = [eq(categories.storeId, storeId), eq(categories.slug, slug)];
  
  if (excludeCategoryId) {
    conditions.push(sql`${categories.id} != ${excludeCategoryId}`);
  }

  const category = await db.query.categories.findFirst({
    where: and(...conditions),
  });
  return !!category;
}

export async function createCategory(userId: string, data: { name: string; slug: string; description?: string }) {
  const store = await getStoreByUserId(userId);

  const slugExists = await checkIfCategorySlugExists(store.id, data.slug);
  if (slugExists) {
    throw new Error("Já existe uma categoria com este link (slug).");
  }

  // Pegar o último displayOrder desta loja para incrementar em 10
  const lastCategory = await db.query.categories.findFirst({
    where: eq(categories.storeId, store.id),
    orderBy: [desc(categories.displayOrder)],
  });

  const nextDisplayOrder = lastCategory ? lastCategory.displayOrder + 10 : 10;

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
  const store = await getStoreByUserId(userId);

  // Verificar se a categoria pertence a esta loja
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const slugExists = await checkIfCategorySlugExists(store.id, data.slug, categoryId);
  if (slugExists) {
    throw new Error("Já existe outra categoria com este link (slug).");
  }

  const [updatedCategory] = await db.update(categories).set({
    name: data.name,
    slug: data.slug,
    description: data.description,
    updatedAt: new Date(),
  }).where(eq(categories.id, categoryId)).returning();

  return updatedCategory;
}

export async function deleteCategory(userId: string, categoryId: string) {
  const store = await getStoreByUserId(userId);

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
}

export async function listCategories(userId: string) {
  const store = await getStoreByUserId(userId);

  return db.query.categories.findMany({
    where: eq(categories.storeId, store.id),
    orderBy: (categories, { asc }) => [asc(categories.displayOrder)],
  });
}

// O reorder recebe um array de objetos { id, displayOrder }
export async function reorderCategories(userId: string, items: { id: string; displayOrder: number }[]) {
  const store = await getStoreByUserId(userId);

  // Idealmente executar dentro de uma transação
  await db.transaction(async (tx) => {
    for (const item of items) {
      // Usamos storeId no where para garantir segurança (não alterar categorias de outros lojistas)
      await tx.update(categories)
        .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
        .where(and(eq(categories.id, item.id), eq(categories.storeId, store.id)));
    }
  });
}
