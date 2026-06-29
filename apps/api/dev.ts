import { serve } from '@hono/node-server';
import app from './api/index';

/**
 * Local development server (not used in production — Vercel hosts the functions).
 * Run with `npm run dev --workspace @sostenve/api`. Requires the env vars from
 * `.env` (Supabase, secrets). CORS allows the web app per config.
 */
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`SostenVE API (dev) on http://localhost:${info.port}/api/v1\n`);
});
