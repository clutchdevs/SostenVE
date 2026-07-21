import { Hono } from 'hono';
import { getConfig } from '../../../config/index.js';

/**
 * Informed-consent text endpoints. Config-driven and DB-free so the UI can always
 * render the current text and the version to accept.
 *
 * - `/active`: bioethical consent the psychologist must accept at registration
 *   (RF-2.1.1, Módulo 2). The version is echoed back on registration to record
 *   exactly which wording was accepted (auditable consent).
 * - `/requester`: informational consent/privacy notice shown on every requester
 *   screen (issue #1). Non-blocking, so it is not recorded per-acceptance.
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

  router.get('/requester', (c) => {
    const { requester } = getConfig().consent;
    return c.json({
      version: requester.version,
      updated_at: requester.updated_at,
      text: requester.text,
    });
  });

  // Confidentiality + accountability notice for the closed-case reports section
  // (issue #169). Served like the others so the FPV can reword it without a code
  // change and the wording in force stays versioned.
  router.get('/reports', (c) => {
    const { reports } = getConfig().consent;
    return c.json({
      version: reports.version,
      updated_at: reports.updated_at,
      text: reports.text,
    });
  });

  return router;
}
