import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CaseContact,
  CaseContactRepository,
  CaseRecord,
  CaseRepository,
  CaseStatus,
  NewCase,
} from '../../domain/case/case.js';
import type { RiskLevel } from '../../domain/triage/index.js';
import {
  branchFromDb,
  branchToDb,
  contactMethodFromDb,
  contactMethodToDb,
  modalityFromDb,
  modalityToDb,
  requesterFromDb,
  requesterToDb,
  riskFromDb,
  riskToDb,
  statusFromDb,
  statusToDb,
} from './enum-maps.js';

interface CaseRow {
  id: string;
  pseudonym_id: string;
  branch: string;
  risk_level: string;
  urgency_score: number;
  status: string;
  requester_type: string | null;
  zone: string | null;
  region: string | null;
  preferred_modality: string | null;
  preferred_contact_method: string | null;
  age: number | null;
  habit_changes: string[] | null;
  intake_tags: string[] | null;
  urgency_answer: number | null;
  requires_child_specialty: boolean | null;
  created_at: string;
  sla_expires_at: string | null;
}

function toDomain(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    pseudonymId: row.pseudonym_id,
    branch: branchFromDb[row.branch] ?? 'GREEN',
    riskLevel: (riskFromDb[row.risk_level] ?? 'FOLLOW_UP') as RiskLevel,
    urgencyScore: row.urgency_score,
    status: statusFromDb[row.status] ?? 'PENDING',
    requesterType: row.requester_type ? requesterFromDb[row.requester_type] : undefined,
    zone: row.zone ?? undefined,
    region: row.region ?? undefined,
    preferredModality: row.preferred_modality
      ? modalityFromDb[row.preferred_modality]
      : undefined,
    preferredContactMethod: row.preferred_contact_method
      ? contactMethodFromDb[row.preferred_contact_method]
      : undefined,
    age: row.age ?? undefined,
    habitChanges: row.habit_changes ?? undefined,
    intakeTags: row.intake_tags ?? undefined,
    urgencyAnswer: row.urgency_answer ?? undefined,
    requiresChildSpecialty: row.requires_child_specialty ?? undefined,
    createdAt: new Date(row.created_at),
    slaExpiresAt: row.sla_expires_at ? new Date(row.sla_expires_at) : undefined,
  };
}

export class SupabaseCaseRepository implements CaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewCase): Promise<CaseRecord> {
    const { data, error } = await this.client
      .from('cases')
      .insert({
        pseudonym_id: input.pseudonymId,
        branch: branchToDb[input.branch],
        risk_level: riskToDb[input.riskLevel],
        urgency_score: input.urgencyScore,
        status: statusToDb[input.status ?? 'PENDING'],
        requester_type: input.requesterType ? requesterToDb[input.requesterType] : null,
        zone: input.zone ?? null,
        region: input.region ?? null,
        preferred_modality: input.preferredModality
          ? modalityToDb[input.preferredModality]
          : null,
        preferred_contact_method: input.preferredContactMethod
          ? contactMethodToDb[input.preferredContactMethod]
          : null,
        age: input.age ?? null,
        habit_changes: input.habitChanges ?? null,
        intake_tags: input.intakeTags ?? null,
        urgency_answer: input.urgencyAnswer ?? null,
        requires_child_specialty: input.requiresChildSpecialty ?? false,
        sla_expires_at: input.slaExpiresAt?.toISOString() ?? null,
      })
      .select()
      .single();
    if (error) {
      // A person may hold only one OPEN case at a time (partial unique index
      // idx_cases_active_pseudonym). A unique violation here means a concurrent or
      // retried submission for someone who already has an open case — so return
      // that case and keep intake idempotent instead of surfacing a 500 the client
      // would retry forever (offline outbox). A new case is still created once the
      // previous one is closed, since closed cases are excluded from the index.
      if (error.code === '23505') {
        const existing = await this.findActiveByPseudonymId(input.pseudonymId);
        if (existing) return existing;
      }
      throw new Error(`Failed to create case: ${error.message}`);
    }
    return toDomain(data as CaseRow);
  }

  /** The person's current open (non-closed) case, if any. */
  private async findActiveByPseudonymId(pseudonymId: string): Promise<CaseRecord | null> {
    const { data, error } = await this.client
      .from('cases')
      .select()
      .eq('pseudonym_id', pseudonymId)
      .neq('status', statusToDb.CLOSED)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to look up active case: ${error.message}`);
    return data ? toDomain(data as CaseRow) : null;
  }

  async findById(id: string): Promise<CaseRecord | null> {
    const { data, error } = await this.client.from('cases').select().eq('id', id).maybeSingle();
    if (error) throw new Error(`Failed to load case: ${error.message}`);
    return data ? toDomain(data as CaseRow) : null;
  }

  async listByStatus(status: CaseStatus): Promise<CaseRecord[]> {
    const { data, error } = await this.client
      .from('cases')
      .select()
      .eq('status', statusToDb[status]);
    if (error) throw new Error(`Failed to list cases: ${error.message}`);
    return (data as CaseRow[]).map(toDomain);
  }

  async listAll(): Promise<CaseRecord[]> {
    const { data, error } = await this.client
      .from('cases')
      .select()
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list cases: ${error.message}`);
    return (data as CaseRow[]).map(toDomain);
  }

  async updateRiskLevel(id: string, riskLevel: RiskLevel): Promise<void> {
    const { error } = await this.client
      .from('cases')
      .update({ risk_level: riskToDb[riskLevel] })
      .eq('id', id);
    if (error) throw new Error(`Failed to update case risk level: ${error.message}`);
  }

  async listOverdueHighRiskAssigned(now: Date): Promise<CaseRecord[]> {
    const { data, error } = await this.client
      .from('cases')
      .select()
      .eq('status', statusToDb.ASSIGNED)
      .eq('risk_level', riskToDb.HIGH)
      .lt('sla_expires_at', now.toISOString());
    if (error) throw new Error(`Failed to list overdue cases: ${error.message}`);
    return (data as CaseRow[]).map(toDomain);
  }

  async claimForAssignment(id: string): Promise<boolean> {
    // Conditional update (`WHERE id = ? AND status = 'pendiente'`) is atomic at
    // the row level in Postgres: of two concurrent claims only one matches the
    // still-PENDING row; the other updates zero rows and returns false.
    const { data, error } = await this.client
      .from('cases')
      .update({ status: statusToDb.ASSIGNED })
      .eq('id', id)
      .eq('status', statusToDb.PENDING)
      .select('id');
    if (error) throw new Error(`Failed to claim case for assignment: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }

  async updateStatus(id: string, status: CaseStatus): Promise<void> {
    const { error } = await this.client
      .from('cases')
      .update({ status: statusToDb[status] })
      .eq('id', id);
    if (error) throw new Error(`Failed to update case status: ${error.message}`);
  }

  async updateSlaExpiresAt(id: string, slaExpiresAt: Date | null): Promise<void> {
    const { error } = await this.client
      .from('cases')
      .update({ sla_expires_at: slaExpiresAt?.toISOString() ?? null })
      .eq('id', id);
    if (error) throw new Error(`Failed to update case SLA: ${error.message}`);
  }
}

interface CaseContactRow {
  pseudonym_id: string;
  name: string | null;
  contact: string;
}

export class SupabaseCaseContactRepository implements CaseContactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(contact: CaseContact): Promise<void> {
    const { error } = await this.client.from('case_contacts').upsert({
      pseudonym_id: contact.pseudonymId,
      name: contact.name ?? null,
      contact: contact.contact,
    });
    if (error) throw new Error(`Failed to upsert case contact: ${error.message}`);
  }

  async findByPseudonymId(pseudonymId: string): Promise<CaseContact | null> {
    const { data, error } = await this.client
      .from('case_contacts')
      .select()
      .eq('pseudonym_id', pseudonymId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load case contact: ${error.message}`);
    if (!data) return null;
    const row = data as CaseContactRow;
    return { pseudonymId: row.pseudonym_id, name: row.name ?? undefined, contact: row.contact };
  }
}
