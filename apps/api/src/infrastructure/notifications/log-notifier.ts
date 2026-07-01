import type {
  InvitationNotification,
  Notifier,
  PasswordResetNotification,
  RegistrationNotification,
} from '../../application/volunteer/ports';
import { logger } from '../../shared/logger';

/**
 * Notifier stand-in that logs the notification (PII redacted by the logger)
 * instead of sending email — the default when `email.provider` is `log`. The
 * real adapter is {@link SmtpNotifier}. The temporary password is never logged.
 */
export class LogNotifier implements Notifier {
  async notifyRegistrationApproved(notification: RegistrationNotification): Promise<void> {
    logger.info('volunteer registration approved (welcome email would be sent)', {
      email: notification.email,
      withCredentials: notification.temporaryPassword !== undefined,
    });
  }

  async notifyRegistrationPending(notification: RegistrationNotification): Promise<void> {
    logger.info('volunteer registration pending review (email would be sent)', {
      email: notification.email,
    });
  }

  async notifyCoordinatorInvitation(notification: InvitationNotification): Promise<void> {
    // The acceptUrl carries the raw token; never log it.
    logger.info('coordinator invitation created (invite email would be sent)', {
      email: notification.email,
      expiresAt: notification.expiresAt.toISOString(),
    });
  }

  async notifyPasswordReset(notification: PasswordResetNotification): Promise<void> {
    // The resetUrl carries the raw token; never log it.
    logger.info('password reset requested (reset email would be sent)', {
      email: notification.email,
      expiresAt: notification.expiresAt.toISOString(),
    });
  }
}
