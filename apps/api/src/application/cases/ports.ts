import type { AssignmentRepository } from '../../domain/assignment/assignment.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type { CaseContactRepository, CaseRepository } from '../../domain/case/case.js';
import type { ClinicalNoteRepository } from '../../domain/clinical/clinical-note.js';
import type { CaseClosureRepository } from '../../domain/clinical/case-closure.js';
import type { AppConfig } from '../../config/index.js';

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
