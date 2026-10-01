import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verifica se um lojista já possui uma loja criada.
 */
export async function checkIfUserHasStore(userId: string): Promise<boolean> {
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, userId),
  });
  return !!store;
}

/**
 * Verifica se um slug já está sendo utilizado por outra loja.
 */
export async function checkIfSlugIsTaken(slug: string): Promise<boolean> {
  const store = await db.query.stores.findFirst({
    where: eq(stores.slug, slug),
  });
  return !!store;
}

/**
 * Função de Domínio: Orquestra a criação segura de uma loja, 
 * validando as regras de negócio de unicidade e limites.
 */
export async function createStore(userId: string, name: string, slug: string) {
  const hasStore = await checkIfUserHasStore(userId);
  if (hasStore) {
    throw new Error("Você já possui uma vitrine cadastrada.");
  }

  const isSlugTaken = await checkIfSlugIsTaken(slug);
  if (isSlugTaken) {
    throw new Error("Esse link já está em uso por outra confeitaria. Escolha outro.");
  }

  const [newStore] = await db.insert(stores).values({
    userId,
    name,
    slug,
  }).returning();

  return newStore;
}

export type UpdateCustomizationData = {
  themeColors?: { primary: string; background: string; text: string };
  layoutConfig?: { productView: 'list' | 'grid'; categoryPosition: 'top' | 'sidebar' };
  bannerUrl?: string | null;
  profileUrl?: string | null;
};

/**
 * Função de Domínio: Atualiza a personalização visual da vitrine.
 */
export async function updateStoreCustomization(userId: string, data: UpdateCustomizationData) {
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, userId),
  });

  if (!store) {
    throw new Error("Vitrine não encontrada.");
  }

  await db.update(stores).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(stores.id, store.id));
}
