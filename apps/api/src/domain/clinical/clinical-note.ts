/**
 * Clinical note entity and repository port. Diagnosis and content are restricted
 * data encrypted at rest by the infrastructure adapter (ADR-0004); the domain
 * works with plaintext values and never knows about encryption.
 */
export interface ClinicalNote {
  id: string;
  caseId: string;
  authorVolunteerId: string;
  diagnosis?: string;
  content: string;
  createdAt: Date;
}

export interface NewClinicalNote {
  caseId: string;
  authorVolunteerId: string;
  diagnosis?: string;
  content: string;
}

export interface ClinicalNoteRepository {
  create(input: NewClinicalNote): Promise<ClinicalNote>;
  listByCaseId(caseId: string): Promise<ClinicalNote[]>;
}
