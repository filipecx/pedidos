import { db } from "../src/db/index.js";
import { products, stores, categories } from "../src/db/schema/index.js";

async function run() {
  const allStores = await db.select().from(stores);
  console.log("Stores:", allStores);

  const allCategories = await db.select().from(categories);
  console.log("Categories:", allCategories);

  const allProducts = await db.select().from(products);
  console.log("Products:", allProducts);

  process.exit(0);
}
run();
