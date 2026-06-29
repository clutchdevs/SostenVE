import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration/e2e tests share one local Supabase DB and some exercise global
    // queries (assignment/SLA cron); run files sequentially to avoid cross-file races.
    fileParallelism: false,
  },
});
