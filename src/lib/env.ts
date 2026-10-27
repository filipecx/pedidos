import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  R2_URL: z.string().url('R2_URL is required'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
});

// Remove aspas sobrando e espaços que o Docker Compose / env_file possa ter injetado
const sanitizedEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '') : value,
  ])
);

const parsedEnv = envSchema.safeParse(sanitizedEnv);

if (!parsedEnv.success) {
  const formatted = JSON.stringify(parsedEnv.error.format(), null, 2);
  console.error('❌ Invalid environment variables:\n', formatted);
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

export const env = parsedEnv.data;
