import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CaseContact,
  CaseContactRepository,
  CaseRecord,
  CaseRepository,
  CaseStatus,
  NewCase,
} from '../../domain/case/case';
import type { RiskLevel } from '../../domain/triage';
import {
  branchFromDb,
  branchToDb,
  modalityFromDb,
  modalityToDb,
  requesterFromDb,
  requesterToDb,
  riskFromDb,
  riskToDb,
  statusFromDb,
  statusToDb,
} from './enum-maps';

interface CaseRow {
  id: string;
  pseudonym_id: string;
  branch: string;
  risk_level: string;
  urgency_score: number;
  status: string;
  requester_type: string | null;
  zone: string | null;
  preferred_modality: string | null;
  age: number | null;
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
    preferredModality: row.preferred_modality
      ? modalityFromDb[row.preferred_modality]
      : undefined,
    age: row.age ?? undefined,
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
        preferred_modality: input.preferredModality
          ? modalityToDb[input.preferredModality]
          : null,
        age: input.age ?? null,
        sla_expires_at: input.slaExpiresAt?.toISOString() ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create case: ${error.message}`);
    return toDomain(data as CaseRow);
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

  async updateStatus(id: string, status: CaseStatus): Promise<void> {
    const { error } = await this.client
      .from('cases')
      .update({ status: statusToDb[status] })
      .eq('id', id);
    if (error) throw new Error(`Failed to update case status: ${error.message}`);
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
