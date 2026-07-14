/**
 * Volunteer aggregate (psychologists, coordinators, admins) and its repository
 * port. Validation against the FPV registry and status transitions are handled in
 * later blocks; this defines the persistence contract.
 */
export type VolunteerRole = 'psychologist' | 'coordinator' | 'admin';
export type VolunteerStatus = 'active' | 'pending_approval' | 'inactive';
export type DocumentType = 'V' | 'E' | 'P';
export type Modalidad = 'presencial' | 'distancia';

/** Structured availability slot (RF-2.1.2): weekday × time-of-day block. */
export interface AvailabilitySlot {
  dia: string;
  bloque: string;
}

/** Full applicant profile collected at registration (RF-2.1.2). */
export interface VolunteerApplication {
  documentType: DocumentType;
  documentNumber: string;
  university: string;
  graduationYear: number;
  colegio: string;
  /** Country and city of residence (#128). */
  paisResidencia?: string;
  ciudadResidencia?: string;
  modalities: Modalidad[];
  availabilitySchedule: AvailabilitySlot[];
  papTrained: boolean;
  papDetail?: string;
}

/** Why a registration could not be auto-validated (RF-2.2 exception case). */
export type PendingReason = 'fpv_unreachable' | 'fpv_not_found' | 'pap_not_declared';

export interface Volunteer {
  id: string;
  fullName: string;
  professionalId: string;
  email?: string;
  specialty?: string;
  availability?: string;
  /** Colegio de Psicólogos (Venezuelan state) — proxy for the regional cluster (RF-3.1). */
  colegio?: string;
  /** Contact phone (coordinator sign-up, RF-2.6.2). */
  phone?: string;
  /** Primary role — used for the default post-login redirect and back-compat. */
  role: VolunteerRole;
  /** All roles the account holds (#133). Authorization checks against this set. */
  roles: VolunteerRole[];
  tokenVersion: number;
  status: VolunteerStatus;
  /** Set only while `pending_approval` to explain the manual-review reason. */
  pendingReason?: PendingReason;
  createdAt: Date;
}

/**
 * Full volunteer record for the coordinator/admin review view (RF-2.3): the core
 * volunteer plus the identity document and the applicant profile (RF-2.1.2) and
 * the accepted consent (RF-2.1.1), so a reviewer can decide who to admit and tell
 * apart two applicants with the same name.
 */
export interface VolunteerDetail extends Volunteer {
  documentType?: DocumentType;
  documentNumber?: string;
  application?: VolunteerApplication;
  consentVersion?: string;
  consentAcceptedAt?: Date;
}

export interface NewVolunteer {
  fullName: string;
  professionalId: string;
  email?: string;
  specialty?: string;
  availability?: string;
  role?: VolunteerRole;
  /** Initial role set; defaults to `[role]` when omitted. */
  roles?: VolunteerRole[];
  passwordHash: string;
  status?: VolunteerStatus;
  /** Manual-review reason recorded when status is `pending_approval` (RF-2.2). */
  pendingReason?: PendingReason;
  /**
   * Identity fields captured outside the psychologist `application` (e.g. the
   * coordinator sign-up, RF-2.6.2): document type/number and phone. When an
   * `application` is present its values take precedence.
   */
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  /** Full applicant profile (RF-2.1.2); optional for minimal/seeded inserts. */
  application?: VolunteerApplication;
  /** Informed-consent acceptance recorded at registration (RF-2.1.1). */
  consentVersion?: string;
  consentAcceptedAt?: Date;
}

export interface VolunteerRepository {
  create(input: NewVolunteer): Promise<Volunteer>;
  findById(id: string): Promise<Volunteer | null>;
  /** Full record (application + document + consent) for the review view (RF-2.3). */
  getDetailById(id: string): Promise<VolunteerDetail | null>;
  findByProfessionalId(professionalId: string): Promise<Volunteer | null>;
  findByEmail(email: string): Promise<Volunteer | null>;
  /** Adds a role to an account if it doesn't already have it (idempotent, #133). */
  addRole(id: string, role: VolunteerRole): Promise<void>;
  listByStatus(status: VolunteerStatus): Promise<Volunteer[]>;
  /** All volunteers regardless of status (admin roster / "padrón"). */
  listAll(): Promise<Volunteer[]>;
  /** Returns the stored password hash for authentication, or null. */
  getPasswordHash(id: string): Promise<string | null>;
  /** Replaces the stored password hash (e.g. credentials reissued on approval). */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  setStatus(id: string, status: VolunteerStatus): Promise<void>;
  /** Bumps token_version to invalidate previously issued tokens (ADR-0005). */
  bumpTokenVersion(id: string): Promise<number>;
  /** Current token_version for per-request session validation (RF-2.7), or null. */
  getTokenVersion(id: string): Promise<number | null>;
}
