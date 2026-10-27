import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não definida. Migração cancelada.');
    process.exit(1);
  }

  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':***@');
  console.log(`📡 URL do Banco configurada: ${maskedUrl}`);

  if (databaseUrl.includes('@localhost') || databaseUrl.includes('@127.0.0.1')) {
    console.warn('⚠️ AVISO: DATABASE_URL está usando localhost! Dentro da rede Docker, você deve usar o nome do container "postgres" (ex: postgresql://postgres:postgres@postgres:5432/pedidos).');
  }

  const maxAttempts = 10;
  let attempt = 1;
  let migrationClient;

  while (attempt <= maxAttempts) {
    try {
      console.log(`⏳ [Tentativa ${attempt}/${maxAttempts}] Conectando ao banco para executar migrações...`);
      migrationClient = postgres(databaseUrl, { max: 1, connect_timeout: 5 });
      const db = drizzle(migrationClient);

      const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');
      console.log(`📁 Aplicando migrações a partir de: ${migrationsFolder}`);
      await migrate(db, { migrationsFolder });
      console.log('✅ Migrações aplicadas com sucesso!');
      await migrationClient.end();
      process.exit(0);
    } catch (error: any) {
      if (migrationClient) {
        await migrationClient.end().catch(() => {});
      }
      console.warn(`⚠️ Falha ao conectar/migrar (tentativa ${attempt}/${maxAttempts}): ${error.message || error}`);
      if (attempt === maxAttempts) {
        console.error('❌ Erro definitivo ao aplicar migrações após múltiplas tentativas:', error);
        process.exit(1);
      }
      attempt++;
      await sleep(3000);
    }
  }
}

runMigrations();
