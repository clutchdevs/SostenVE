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
  modalities: Modalidad[];
  availabilitySchedule: AvailabilitySlot[];
  papTrained: boolean;
  papDetail?: string;
}

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
  /** Full applicant profile (RF-2.1.2); optional for minimal/seeded inserts. */
  application?: VolunteerApplication;
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
