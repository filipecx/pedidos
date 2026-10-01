import Redis from 'ioredis';
import { env } from './env';

// Padrão Singleton parecido com o do Banco de Dados
// Isso impede que o Next.js abra 1000 conexões com o Redis a cada vez que você der Ctrl+S (Hot Reload)
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // O BullMQ exige que isso seja 'null' para funcionar corretamente
});

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
