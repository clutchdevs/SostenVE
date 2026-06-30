import type { AppConfig } from '../../config';
import type { Notifier } from '../../application/volunteer/ports';
import { LogNotifier } from './log-notifier';
import { SmtpNotifier } from './smtp-notifier';

/**
 * Builds the volunteer notifier from config (mirrors `createFpvVerifier`):
 * `log` keeps things offline (tests/dev default), `smtp` sends real email.
 */
export function createNotifier(config: AppConfig): Notifier {
  return config.email.provider === 'smtp' ? new SmtpNotifier(config.email) : new LogNotifier();
}
