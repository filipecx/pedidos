import { db } from "@/db";
import { products, stores, Product } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============================================================================
// VALIDAÇÕES E INVARIANTES DE DOMÍNIO
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
// SERVIÇOS DE ESTOQUE
// ============================================================================

export interface StockStatusSummary {
  hasZeroStockItems: boolean;
  zeroStockCount: number;
  totalProntaEntregaCount: number;
  items: Array<{
    id: string;
    name: string;
    stockQuantity: number | null;
    defaultStock: number | null;
  }>;
}

/**
 * Retorna o diagnóstico de estoque para apoiar a decisão ao abrir a loja.
 * Avalia apenas produtos ativos de pronta-entrega.
 */
export async function getStoreStockStatusSummary(userId: string): Promise<StockStatusSummary> {
  const store = await assertStoreExists(userId);

  const allProducts = await db.query.products.findMany({
    where: and(
      eq(products.storeId, store.id),
      eq(products.isProntaEntrega, true),
      eq(products.isActive, true)
    ),
  });

  const zeroStockItems = allProducts.filter(
    (p: any) =>
      p.isProntaEntrega === true &&
      p.isActive === true &&
      (p.stockQuantity === 0 || p.stockQuantity === null)
  );

  const totalProntaEntrega = allProducts.filter(
    (p: any) => p.isProntaEntrega === true && p.isActive === true
  ).length;

  return {
    hasZeroStockItems: zeroStockItems.length > 0,
    zeroStockCount: zeroStockItems.length,
    totalProntaEntregaCount: totalProntaEntrega,
    items: zeroStockItems.map((p: any) => ({
      id: p.id,
      name: p.name,
      stockQuantity: p.stockQuantity,
      defaultStock: p.defaultStock ?? p.stockQuantity,
    })),
  };
}

/**
 * Restaura o estoque de TODOS os produtos de pronta-entrega ativos da loja
 * para o seu valor padrão (cadastrado no produto).
 * Ignora produtos cujo padrão seja 0 ou indefinido.
 */
export async function restoreStoreDefaultStock(userId: string) {
  const store = await assertStoreExists(userId);

  const activeProducts = await db.query.products.findMany({
    where: and(
      eq(products.storeId, store.id),
      eq(products.isProntaEntrega, true),
      eq(products.isActive, true)
    ),
  });

  // Filtra produtos que possuem padrão válido maior que 0
  const productsToRestore = activeProducts.filter(
    (p: any) => (p.defaultStock ?? p.stockQuantity ?? 0) > 0
  );

  if (productsToRestore.length === 0) {
    return {
      updatedCount: 0,
      products: [],
    };
  }

  const updatedResults: Array<{ id: string; stockQuantity: number | null }> = [];

  for (const item of productsToRestore as any[]) {
    const targetStock = item.defaultStock ?? item.stockQuantity;
    const [updated] = await db
      .update(products)
      .set({
        stockQuantity: targetStock,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, item.id), eq(products.storeId, store.id)))
      .returning();

    if (updated) {
      updatedResults.push({ id: updated.id, stockQuantity: updated.stockQuantity });
    }
  }

  return {
    updatedCount: updatedResults.length,
    products: updatedResults,
  };
}

/**
 * Restaura o estoque de um único produto específico para o seu valor padrão.
 */
export async function restoreSingleProductStock(userId: string, productId: string) {
  const store = await assertStoreExists(userId);
  const product = (await assertProductOwnership(productId, store.id)) as any;

  if (!product.isProntaEntrega) {
    throw new Error("Produtos sob encomenda não gerenciam estoque de pronta-entrega.");
  }

  const targetStock = product.defaultStock ?? product.stockQuantity;

  if (!targetStock || targetStock <= 0) {
    throw new Error("Este produto não possui um estoque padrão definido maior que zero.");
  }

  const [updated] = await db
    .update(products)
    .set({
      stockQuantity: targetStock,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
    .returning();

  return updated;
}

export interface QuickUpdateStockInput {
  productId: string;
  stockQuantity: number;
}

/**
 * Atualização manual e rápida de estoque (ajuste pontual de 1 produto).
 */
export async function quickUpdateProductStock(
  userId: string,
  input: QuickUpdateStockInput
) {
  if (input.stockQuantity < 0) {
    throw new Error("O estoque não pode ser negativo.");
  }

  const store = await assertStoreExists(userId);
  const product = await assertProductOwnership(input.productId, store.id);

  if (!product.isProntaEntrega) {
    throw new Error("Produtos sob encomenda não gerenciam estoque de pronta-entrega.");
  }

  const [updated] = await db
    .update(products)
    .set({
      stockQuantity: input.stockQuantity,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, input.productId), eq(products.storeId, store.id)))
    .returning();

  return updated;
}
