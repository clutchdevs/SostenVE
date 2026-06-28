import { Hono } from 'hono';
import { getConfig } from '../src/config';

/**
 * API entry point. All routes are versioned under `/api/v1` (see CONTRIBUTING.md).
 * Real endpoints and security middlewares are added in later blocks (1.5, 3+).
 * The Vercel platform adapter is finalized in Block 8 (deployment).
 */
export const app = new Hono().basePath('/api/v1');

app.get('/health', (c) => {
  return c.json({ status: 'ok', app: getConfig().app.name });
});

export default app;
