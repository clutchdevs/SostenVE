import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { CaseRepository } from '../../domain/case/case';
import type { ClinicalNoteRepository } from '../../domain/clinical/clinical-note';
import type { AppConfig } from '../../config';

/** Dependencies shared by the case-management use cases. */
export interface CaseDeps {
  cases: CaseRepository;
  assignments: AssignmentRepository;
  notes: ClinicalNoteRepository;
  audit: AuditLogRepository;
  config: AppConfig;
}
