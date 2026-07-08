import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';

/**
 * Asynchronous Psychological First Aid (PAP) self-help guides for the requester
 * (Módulo 1). Config-driven and DB-free so the guides render instantly and even
 * with a cold backend. Public (no auth): self-help content for anyone affected.
 * The version lets clients cache and lets us track which wording is published.
 */
export function createPapRouter(): Hono {
  const router = new Hono();

  router.get('/', (c) => {
    const { version, updated_at, guides } = getConfig().pap;
    return c.json({ version, updated_at, guides });
  });

  return router;
}
