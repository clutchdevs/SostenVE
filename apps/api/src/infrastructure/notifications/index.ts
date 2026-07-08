import type { AppConfig } from '../../config';
import type { Notifier } from '../../application/volunteer/ports';
import { LogNotifier } from './log-notifier';
import { SmtpNotifier } from './smtp-notifier';

/**
 * Builds the volunteer notifier (mirrors `createFpvVerifier`): `log` keeps things
 * offline (tests/dev default), `smtp` sends real email via nodemailer. The
 * provider can be overridden by the `EMAIL_PROVIDER` env var so a real SMTP can
 * be enabled per-environment without editing the committed config (keeps the
 * default `log` for tests).
 */
export function createNotifier(config: AppConfig): Notifier {
  const provider = process.env.EMAIL_PROVIDER || config.email.provider;
  return provider === 'smtp' ? new SmtpNotifier(config.email) : new LogNotifier();
}
