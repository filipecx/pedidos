import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    env: {
      DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_db',
      REDIS_URL: 'redis://localhost:6379',
      NODE_ENV: 'test',
      R2_URL: 'https://test.r2.cloudflarestorage.com',
      R2_PUBLIC_URL: 'https://pub-test.r2.dev',
      R2_ACCESS_KEY_ID: 'test_key_id',
      R2_SECRET_ACCESS_KEY: 'test_secret',
    },
  },
});
