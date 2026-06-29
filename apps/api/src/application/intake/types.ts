import type { CaseBranch, CaseContactRepository, CaseRepository } from '../../domain/case/case';
import type { RiskLevel } from '../../domain/triage';
import type { AppConfig } from '../../config';
import type { ActiveCrisisLine } from './crisis-line-routing';

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
