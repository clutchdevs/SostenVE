import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CaseClosure,
  CaseClosureRepository,
  NewCaseClosure,
} from '../../domain/clinical/case-closure.js';
import { decrypt, encrypt } from '../../shared/security/encryption.js';

interface CaseClosureRow {
  id: string;
  case_id: string;
  author_volunteer_id: string;
  contacted: boolean;
  no_contact_reason: string | null;
  sex: string | null;
  recipient: string | null;
  symptoms: string[];
  other_symptom_encrypted: string | null;
  contact_medium: string | null;
  techniques: string[];
  close_reason: string | null;
  referral_type: string | null;
  referral_destinations: string[] | null;
  minutes: number;
  comment_encrypted: string | null;
  created_at: string;
}

/**
 * Case closure adapter. Encrypts the free-text fields (comment, other symptom) at
 * rest (AES-256-GCM, ADR-0004); coded fields are stored as-is.
 */
export class SupabaseCaseClosureRepository implements CaseClosureRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewCaseClosure): Promise<CaseClosure> {
    const { data, error } = await this.client
      .from('case_closures')
      .insert({
        case_id: input.caseId,
        author_volunteer_id: input.authorVolunteerId,
        contacted: input.contacted,
        no_contact_reason: input.noContactReason ?? null,
        sex: input.sex ?? null,
        recipient: input.recipient ?? null,
        symptoms: input.symptoms ?? [],
        other_symptom_encrypted: input.otherSymptom ? encrypt(input.otherSymptom) : null,
        contact_medium: input.contactMedium ?? null,
        techniques: input.techniques ?? [],
        close_reason: input.closeReason ?? null,
        referral_type: input.referralType ?? null,
        referral_destinations: input.referralDestinations ?? [],
        minutes: input.minutes,
        comment_encrypted: input.comment ? encrypt(input.comment) : null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create case closure: ${error.message}`);
    return this.toDomain(data as CaseClosureRow);
  }

  async findByCaseId(caseId: string): Promise<CaseClosure | null> {
    const { data, error } = await this.client
      .from('case_closures')
      .select()
      .eq('case_id', caseId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load case closure: ${error.message}`);
    return data ? this.toDomain(data as CaseClosureRow) : null;
  }

  private toDomain(row: CaseClosureRow): CaseClosure {
    return {
      id: row.id,
      caseId: row.case_id,
      authorVolunteerId: row.author_volunteer_id,
      contacted: row.contacted,
      noContactReason: row.no_contact_reason ?? undefined,
      sex: row.sex ?? undefined,
      recipient: row.recipient ?? undefined,
      symptoms: row.symptoms ?? [],
      otherSymptom: row.other_symptom_encrypted ? decrypt(row.other_symptom_encrypted) : undefined,
      contactMedium: row.contact_medium ?? undefined,
      techniques: row.techniques ?? [],
      closeReason: row.close_reason ?? undefined,
      referralType: row.referral_type ?? undefined,
      referralDestinations: row.referral_destinations ?? [],
      minutes: Number(row.minutes),
      comment: row.comment_encrypted ? decrypt(row.comment_encrypted) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
