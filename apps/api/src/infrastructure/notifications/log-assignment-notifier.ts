import type { AssignmentNotifier } from '../../application/assignment/ports.js';
import { logger } from '../../shared/logger.js';

/**
 * Assignment notifier stand-in that logs instead of contacting volunteers /
 * coordinators. Replace with a real channel (WhatsApp link / email) later.
 * TODO — Human-in-the-Loop.
 */
export class LogAssignmentNotifier implements AssignmentNotifier {
  async notifyAssigned(input: { volunteerId: string; caseId: string }): Promise<void> {
    logger.info('case assigned to volunteer (notification would be sent)', input);
  }

  async notifyEscalated(input: { caseId: string }): Promise<void> {
    logger.warn('case escalated to coordinators (notification would be sent)', input);
  }
}
