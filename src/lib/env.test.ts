import { describe, it, expect } from 'vitest';
import { env, envSchema } from './env';

describe('Environment Configuration', () => {
  it('loads test environment correctly from Vitest runner', () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('fails validation when DATABASE_URL is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'test',
    };

    const result = envSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
