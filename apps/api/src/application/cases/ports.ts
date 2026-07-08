import type { AssignmentRepository } from '../../domain/assignment/assignment';
import type { AuditLogRepository } from '../../domain/audit/audit';
import type { CaseContactRepository, CaseRepository } from '../../domain/case/case';
import type { ClinicalNoteRepository } from '../../domain/clinical/clinical-note';
import type { CaseClosureRepository } from '../../domain/clinical/case-closure';
import type { AppConfig } from '../../config';

/** Dependencies shared by the case-management use cases. */
export interface CaseDeps {
  cases: CaseRepository;
  contacts: CaseContactRepository;
  assignments: AssignmentRepository;
  notes: ClinicalNoteRepository;
  closures: CaseClosureRepository;
  audit: AuditLogRepository;
  config: AppConfig;
}
