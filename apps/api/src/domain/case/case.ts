import type { RiskLevel } from '../triage';

/**
 * Case aggregate (operational/clinical row, no direct PII) and its separated PII
 * contact. Repository ports are defined here; Supabase adapters live in
 * infrastructure (Repository Pattern). Domain values are English; adapters map to
 * the DB/contract Spanish enum values.
 */
export type CaseBranch = 'RED' | 'GREEN';
export type CaseStatus = 'PENDING' | 'ASSIGNED' | 'ACCEPTED' | 'IN_FOLLOW_UP' | 'CLOSED';
export type RequesterType = 'VICTIM' | 'FAMILY' | 'VOLUNTEER';
export type Modality = 'IN_PERSON' | 'REMOTE';

export interface CaseRecord {
  id: string;
  pseudonymId: string;
  branch: CaseBranch;
  riskLevel: RiskLevel;
  urgencyScore: number;
  status: CaseStatus;
  requesterType?: RequesterType;
  zone?: string;
  preferredModality?: Modality;
  createdAt: Date;
  slaExpiresAt?: Date;
}

export interface NewCase {
  pseudonymId: string;
  branch: CaseBranch;
  riskLevel: RiskLevel;
  urgencyScore: number;
  status?: CaseStatus;
  requesterType?: RequesterType;
  zone?: string;
  preferredModality?: Modality;
  slaExpiresAt?: Date;
}

export interface CaseRepository {
  create(input: NewCase): Promise<CaseRecord>;
  findById(id: string): Promise<CaseRecord | null>;
  listByStatus(status: CaseStatus): Promise<CaseRecord[]>;
  updateStatus(id: string, status: CaseStatus): Promise<void>;
}

/** Separated PII (ADR-0011), linked to a case by pseudonymId. */
export interface CaseContact {
  pseudonymId: string;
  name?: string;
  contact: string;
}

export interface CaseContactRepository {
  upsert(contact: CaseContact): Promise<void>;
  findByPseudonymId(pseudonymId: string): Promise<CaseContact | null>;
}
