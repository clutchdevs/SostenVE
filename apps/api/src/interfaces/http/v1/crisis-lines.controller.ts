import { Hono } from 'hono';
import { getConfig } from '../../../config';
import { getActiveCrisisLine } from '../../../application/intake/get-active-crisis-line';
import { presentCrisisLines } from './presenters';

/**
 * Crisis lines endpoint. Config-driven and DB-free so it stays fast and is never
 * a single point of failure for showing crisis lines (the client also caches it).
 */
export function createCrisisLinesRouter(): Hono {
  const router = new Hono();

  router.get('/active', (c) => {
    return c.json(presentCrisisLines(getActiveCrisisLine(getConfig())));
  });

  return router;
}
