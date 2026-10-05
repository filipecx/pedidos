import { db } from "@/db";
import { stores, categories, products } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { cache } from "react";

export const getStorefrontData = cache(async (slug: string) => {
  // 1. Fetch Store by slug
  const store = await db.query.stores.findFirst({
    where: eq(stores.slug, slug),
  });

  if (!store) {
    return null;
  }

  // 2. Fetch Categories (ordered by displayOrder) with limit for safety
  const storeCategories = await db.query.categories.findMany({
    where: eq(categories.storeId, store.id),
    orderBy: [asc(categories.displayOrder)],
    limit: 100, // safety limit conforme diretriz
  });

  // 3. Fetch Active Products with limit for safety
  const activeProducts = await db.query.products.findMany({
    where: and(
      eq(products.storeId, store.id),
      eq(products.isActive, true)
    ),
    limit: 500, // safety limit conforme diretriz
  });

  return {
    store,
    categories: storeCategories,
    products: activeProducts,
  };
});
