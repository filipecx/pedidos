import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não definida. Migração cancelada.');
    process.exit(1);
  }

  console.log('⏳ Conectando ao banco para executar migrações...');
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');
    console.log(`📁 Aplicando migrações a partir de: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrações aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migrações:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
