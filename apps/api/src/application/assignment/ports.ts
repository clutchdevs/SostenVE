import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { CaseRepository } from '../../domain/case/case';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer';
import type { PresenceStore } from '../presence/ports';

/** Notifies the assigned volunteer / the coordinator cluster (Adapter). */
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
}
