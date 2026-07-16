import type { AssignmentRepository } from '../../domain/assignment/assignment.js';
import type { AssignmentSettingsRepository } from '../../domain/assignment/assignment-settings.js';
import type { CaseRepository } from '../../domain/case/case.js';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer.js';
import type { AppConfig } from '../../config/index.js';
import type { PresenceStore } from '../presence/ports.js';

/** Notifies the assigned volunteer / the coordinators on escalation (Adapter). */
export interface AssignmentNotifier {
  notifyAssigned(input: { volunteerId: string; caseId: string }): Promise<void>;
  notifyEscalated(input: { caseId: string }): Promise<void>;
}

/** Dependencies shared by the assignment use cases. */
export interface AssignmentDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
  volunteers: VolunteerRepository;
  notifier: AssignmentNotifier;
  /** Real-time presence (RF-2.5): only online volunteers receive cases (RF-3.1). */
  presence: PresenceStore;
  /** Admin-configurable caseload cap used to balance load across psychologists. */
  settings: AssignmentSettingsRepository;
  /** App config (used e.g. to reset the acceptance SLA on reassignment, #159). */
  config: AppConfig;
}
