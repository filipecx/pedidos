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

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables. Check your .env file.');
}

export const env = parsedEnv.data;
