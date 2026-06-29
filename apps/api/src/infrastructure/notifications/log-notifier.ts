import type { Notifier, RegistrationNotification } from '../../application/volunteer/ports';
import { logger } from '../../shared/logger';

/**
 * Notifier stand-in that logs the notification (PII redacted by the logger)
 * instead of sending email. Replace with a real SMTP/provider adapter later
 * (SMTP_PASSWORD is already reserved in .env). TODO — Human-in-the-Loop.
 */
export class LogNotifier implements Notifier {
  async notifyRegistrationApproved(notification: RegistrationNotification): Promise<void> {
    logger.info('volunteer registration approved (email would be sent)', {
      email: notification.email,
      fullName: notification.fullName,
    });
  }

  async notifyRegistrationPending(notification: RegistrationNotification): Promise<void> {
    logger.info('volunteer registration pending review (email would be sent)', {
      email: notification.email,
      fullName: notification.fullName,
    });
  }
}
