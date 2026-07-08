import type { CaseBranch, CaseContactRepository, CaseRepository } from '../../domain/case/case.js';
import type { RiskLevel } from '../../domain/triage/index.js';
import type { AppConfig } from '../../config/index.js';
import type { ActiveCrisisLine } from './crisis-line-routing.js';

/** Dependencies shared by the intake use cases (injected by the composition root). */
export interface IntakeDeps {
  cases: CaseRepository;
  contacts: CaseContactRepository;
  config: AppConfig;
  /** Secret salt for pseudonymized ids (PSEUDONYMIZATION_SALT). */
  pseudonymSalt: string;
  /** Clock, injectable for tests. */
  now?: () => Date;
}

/** Result of an intake submission. Crisis lines are present for high-risk cases. */
export interface IntakeCaseResult {
  caseId: string | null;
  branch: CaseBranch;
  riskLevel: RiskLevel;
  urgencyScore: number;
  crisisLines: ActiveCrisisLine | null;
}
