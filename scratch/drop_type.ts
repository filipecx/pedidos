import postgres from "postgres";

async function run() {
  const sql = postgres("postgresql://postgres:postgres@localhost:5432/pedidos");
  await sql`ALTER TABLE products DROP COLUMN type;`;
  await sql`DROP TYPE product_type;`;
  console.log("Done");
  process.exit(0);
}
run();
