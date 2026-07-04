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
/** Requester's preferred contact channel (green-branch screen 2, RF-1.3). */
export type ContactMethod = 'WHATSAPP' | 'CALL';

export interface CaseRecord {
  id: string;
  pseudonymId: string;
  branch: CaseBranch;
  riskLevel: RiskLevel;
  urgencyScore: number;
  status: CaseStatus;
  requesterType?: RequesterType;
  zone?: string;
  /**
   * Requester's state (green-branch location). Retained as captured location
   * metadata; no longer used for assignment — the FPV eliminated the regional
   * cluster (RF-3.1) on 2026-07-03, so `cases.region` is deprecated for routing.
   */
  region?: string;
  preferredModality?: Modality;
  /** Requester's preferred contact channel (green-branch screen 2, RF-1.3). */
  preferredContactMethod?: ContactMethod;
  age?: number;
  /** Recent habit changes reported at intake (green-branch screen 5, RF-1.3). */
  habitChanges?: string[];
  /** Case carries "Infancia" tags → prefer a child-specialist psychologist (RF-1.3). */
  requiresChildSpecialty?: boolean;
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
  region?: string;
  preferredModality?: Modality;
  preferredContactMethod?: ContactMethod;
  age?: number;
  habitChanges?: string[];
  requiresChildSpecialty?: boolean;
  slaExpiresAt?: Date;
}

export interface CaseRepository {
  create(input: NewCase): Promise<CaseRecord>;
  findById(id: string): Promise<CaseRecord | null>;
  listByStatus(status: CaseStatus): Promise<CaseRecord[]>;
  listAll(): Promise<CaseRecord[]>;
  /** High-risk cases still `assigned` (not accepted) whose SLA has expired. */
  listOverdueHighRiskAssigned(now: Date): Promise<CaseRecord[]>;
  updateStatus(id: string, status: CaseStatus): Promise<void>;
  updateRiskLevel(id: string, riskLevel: RiskLevel): Promise<void>;
  /** Resets (or clears) the acceptance SLA, e.g. on manual reassignment. */
  updateSlaExpiresAt(id: string, slaExpiresAt: Date | null): Promise<void>;
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
