import { db } from "../src/db";
import { products } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const res = await db.query.products.findMany();
    console.log("Success!", res.length);
  } catch (e) {
    console.error(e);
  }
}
run();
