import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { AssignmentSettingsRepository } from '../../domain/assignment/assignment-settings';
import type { CaseRepository } from '../../domain/case/case';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer';
import type { PresenceStore } from '../presence/ports';

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
}
