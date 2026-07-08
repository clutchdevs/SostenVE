import { logger } from './logger.js';

/**
 * Operational alerts (fase 06 · observabilidad).
 *
 * An alert is a **critical, structured** log line (`level: error`, `alert: <type>`)
 * that a log-based alerting pipeline (e.g. Vercel log drains → pager/webhook) can
 * match on. Keeping alerts as structured logs avoids coupling the MVP to a
 * specific alerting vendor while making the signal unambiguous and greppable.
 *
 * The message text is stable so alert rules can key on it; PII is redacted by the
 * logger, so never pass raw domain objects — only ids and counts.
 */
export type AlertType = 'high_risk_escalated_no_coordinator';

export function raiseAlert(type: AlertType, context: Record<string, unknown> = {}): void {
  logger.error(`ALERT: ${type}`, { alert: type, ...context });
}
