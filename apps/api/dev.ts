import { serve } from '@hono/node-server';
import { app } from './api/index.js';

/**
 * Local development server (not used in production — Vercel hosts the functions).
 * Run with `npm run dev --workspace @ppv/api`. Requires the env vars from
 * `.env` (Supabase, secrets). CORS allows the web app per config.
 */
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`PPV API (dev) on http://localhost:${info.port}/api/v1\n`);
});
