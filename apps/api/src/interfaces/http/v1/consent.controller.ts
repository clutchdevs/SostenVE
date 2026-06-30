import { Hono } from 'hono';
import { getConfig } from '../../../config';

/**
 * Informed-consent text endpoint (RF-2.1.1, Módulo 2). Config-driven and DB-free
 * so the registration form can always render the current bioethical text and the
 * version the volunteer must accept. The version is echoed back on registration
 * to record exactly which wording was accepted (auditable consent).
 */
export function createConsentRouter(): Hono {
  const router = new Hono();

  router.get('/active', (c) => {
    const { psychologist } = getConfig().consent;
    return c.json({
      version: psychologist.version,
      updated_at: psychologist.updated_at,
      text: psychologist.text,
    });
  });

  return router;
}
