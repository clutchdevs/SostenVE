/**
 * Volunteer aggregate (psychologists, coordinators, admins) and its repository
 * port. Validation against the FPV registry and status transitions are handled in
 * later blocks; this defines the persistence contract.
 */
export type VolunteerRole = 'psychologist' | 'coordinator' | 'admin';
export type VolunteerStatus = 'active' | 'pending_approval' | 'inactive';

export interface Volunteer {
  id: string;
  fullName: string;
  professionalId: string;
  email?: string;
  specialty?: string;
  availability?: string;
  role: VolunteerRole;
  tokenVersion: number;
  status: VolunteerStatus;
  createdAt: Date;
}

export interface NewVolunteer {
  fullName: string;
  professionalId: string;
  email?: string;
  specialty?: string;
  availability?: string;
  role?: VolunteerRole;
  passwordHash: string;
  status?: VolunteerStatus;
  /** Informed-consent acceptance recorded at registration (RF-2.1.1). */
  consentVersion?: string;
  consentAcceptedAt?: Date;
}

export interface VolunteerRepository {
  create(input: NewVolunteer): Promise<Volunteer>;
  findById(id: string): Promise<Volunteer | null>;
  findByProfessionalId(professionalId: string): Promise<Volunteer | null>;
  findByEmail(email: string): Promise<Volunteer | null>;
  listByStatus(status: VolunteerStatus): Promise<Volunteer[]>;
  /** Returns the stored password hash for authentication, or null. */
  getPasswordHash(id: string): Promise<string | null>;
  setStatus(id: string, status: VolunteerStatus): Promise<void>;
  /** Bumps token_version to invalidate previously issued tokens (ADR-0005). */
  bumpTokenVersion(id: string): Promise<number>;
}
