import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClinicalNote,
  ClinicalNoteRepository,
  NewClinicalNote,
} from '../../domain/clinical/clinical-note.js';
import { decrypt, encrypt } from '../../shared/security/encryption.js';

interface ClinicalNoteRow {
  id: string;
  case_id: string;
  author_volunteer_id: string;
  diagnosis_encrypted: string | null;
  content_encrypted: string;
  created_at: string;
}

/**
 * Clinical notes adapter. Encrypts diagnosis/content at rest (AES-256-GCM,
 * ADR-0004) on write and decrypts on read; the domain only sees plaintext.
 */
export class SupabaseClinicalNoteRepository implements ClinicalNoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewClinicalNote): Promise<ClinicalNote> {
    const { data, error } = await this.client
      .from('clinical_notes')
      .insert({
        case_id: input.caseId,
        author_volunteer_id: input.authorVolunteerId,
        diagnosis_encrypted: input.diagnosis ? encrypt(input.diagnosis) : null,
        content_encrypted: encrypt(input.content),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create clinical note: ${error.message}`);
    return this.toDomain(data as ClinicalNoteRow);
  }

  async listByCaseId(caseId: string): Promise<ClinicalNote[]> {
    const { data, error } = await this.client
      .from('clinical_notes')
      .select()
      .eq('case_id', caseId);
    if (error) throw new Error(`Failed to list clinical notes: ${error.message}`);
    return (data as ClinicalNoteRow[]).map((row) => this.toDomain(row));
  }

  private toDomain(row: ClinicalNoteRow): ClinicalNote {
    return {
      id: row.id,
      caseId: row.case_id,
      authorVolunteerId: row.author_volunteer_id,
      diagnosis: row.diagnosis_encrypted ? decrypt(row.diagnosis_encrypted) : undefined,
      content: decrypt(row.content_encrypted),
      createdAt: new Date(row.created_at),
    };
  }
}
