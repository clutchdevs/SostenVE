import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';
import { getActiveCrisisLineFromDb } from '../../../application/intake/get-active-crisis-line.js';
import { getCrisisLineDeps } from './dependencies.js';
import { presentCrisisLines } from './presenters.js';

/**
 * Crisis lines endpoint. Reads the admin-managed lines from the database, but
 * falls back to the configured lines if the DB is unavailable or empty, so crisis
 * lines are ALWAYS shown (non-negotiable, charter §3). The client also caches the
 * response, adding a second resilience layer.
 */
export function createCrisisLinesRouter(): Hono {
  const router = new Hono();

  router.get('/active', async (c) => {
    const lines = await getActiveCrisisLineFromDb(getCrisisLineDeps(), getConfig());
    return c.json(presentCrisisLines(lines));
  });

  return router;
}
