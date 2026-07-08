import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AvailabilitySlot,
  DocumentType,
  Modalidad,
  NewVolunteer,
  PendingReason,
  Volunteer,
  VolunteerDetail,
  VolunteerRepository,
  VolunteerRole,
  VolunteerStatus,
} from '../../domain/volunteer/volunteer';

interface VolunteerRow {
  id: string;
  full_name: string;
  professional_id: string;
  email: string | null;
  specialty: string | null;
  availability: string | null;
  colegio: string | null;
  phone: string | null;
  role: string;
  token_version: number;
  status: string;
  pending_reason: string | null;
  created_at: string;
}

/** Extra columns loaded for the coordinator/admin review view (RF-2.3). */
interface VolunteerDetailRow extends VolunteerRow {
  document_type: string | null;
  document_number: string | null;
  university: string | null;
  graduation_year: number | null;
  modalities: string[] | null;
  availability_schedule: AvailabilitySlot[] | null;
  pap_trained: boolean | null;
  pap_detail: string | null;
  consent_version: string | null;
  consent_accepted_at: string | null;
}

function toDomain(row: VolunteerRow): Volunteer {
  return {
    id: row.id,
    fullName: row.full_name,
    professionalId: row.professional_id,
    email: row.email ?? undefined,
    specialty: row.specialty ?? undefined,
    availability: row.availability ?? undefined,
    colegio: row.colegio ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role as VolunteerRole,
    tokenVersion: row.token_version,
    status: row.status as VolunteerStatus,
    pendingReason: (row.pending_reason as PendingReason | null) ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function toDetail(row: VolunteerDetailRow): VolunteerDetail {
  const hasApplication =
    row.university !== null || row.graduation_year !== null || row.pap_trained !== null;
  return {
    ...toDomain(row),
    documentType: (row.document_type as DocumentType | null) ?? undefined,
    documentNumber: row.document_number ?? undefined,
    consentVersion: row.consent_version ?? undefined,
    consentAcceptedAt: row.consent_accepted_at ? new Date(row.consent_accepted_at) : undefined,
    application: hasApplication
      ? {
          documentType: (row.document_type as DocumentType | null) ?? 'V',
          documentNumber: row.document_number ?? '',
          university: row.university ?? '',
          graduationYear: row.graduation_year ?? 0,
          colegio: row.colegio ?? '',
          modalities: (row.modalities as Modalidad[] | null) ?? [],
          availabilitySchedule: row.availability_schedule ?? [],
          papTrained: row.pap_trained ?? false,
          papDetail: row.pap_detail ?? undefined,
        }
      : undefined,
  };
}

export class SupabaseVolunteerRepository implements VolunteerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewVolunteer): Promise<Volunteer> {
    const { data, error } = await this.client
      .from('volunteers')
      .insert({
        full_name: input.fullName,
        professional_id: input.professionalId,
        email: input.email ?? null,
        specialty: input.specialty ?? null,
        availability: input.availability ?? null,
        role: input.role ?? 'psychologist',
        password_hash: input.passwordHash,
        status: input.status ?? 'pending_approval',
        pending_reason: input.pendingReason ?? null,
        document_type: input.application?.documentType ?? input.documentType ?? null,
        document_number: input.application?.documentNumber ?? input.documentNumber ?? null,
        phone: input.phone ?? null,
        university: input.application?.university ?? null,
        graduation_year: input.application?.graduationYear ?? null,
        colegio: input.application?.colegio ?? null,
        modalities: input.application?.modalities ?? null,
        availability_schedule: input.application?.availabilitySchedule ?? null,
        pap_trained: input.application?.papTrained ?? null,
        pap_detail: input.application?.papDetail ?? null,
        consent_version: input.consentVersion ?? null,
        consent_accepted_at: input.consentAcceptedAt?.toISOString() ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create volunteer: ${error.message}`);
    return toDomain(data as VolunteerRow);
  }

  async findById(id: string): Promise<Volunteer | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load volunteer: ${error.message}`);
    return data ? toDomain(data as VolunteerRow) : null;
  }

  async getDetailById(id: string): Promise<VolunteerDetail | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load volunteer detail: ${error.message}`);
    return data ? toDetail(data as VolunteerDetailRow) : null;
  }

  async findByProfessionalId(professionalId: string): Promise<Volunteer | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select()
      .eq('professional_id', professionalId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load volunteer: ${error.message}`);
    return data ? toDomain(data as VolunteerRow) : null;
  }

  async findByEmail(email: string): Promise<Volunteer | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select()
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(`Failed to load volunteer: ${error.message}`);
    return data ? toDomain(data as VolunteerRow) : null;
  }

  async listByStatus(status: VolunteerStatus): Promise<Volunteer[]> {
    const { data, error } = await this.client.from('volunteers').select().eq('status', status);
    if (error) throw new Error(`Failed to list volunteers: ${error.message}`);
    return (data as VolunteerRow[]).map(toDomain);
  }

  async listAll(): Promise<Volunteer[]> {
    const { data, error } = await this.client
      .from('volunteers')
      .select()
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list volunteers: ${error.message}`);
    return (data as VolunteerRow[]).map(toDomain);
  }

  async getPasswordHash(id: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select('password_hash')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load credentials: ${error.message}`);
    return data ? (data as { password_hash: string }).password_hash : null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    const { error } = await this.client
      .from('volunteers')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update password: ${error.message}`);
  }

  async setStatus(id: string, status: VolunteerStatus): Promise<void> {
    // An active volunteer has no outstanding exception reason; clear it on activation.
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'active') patch.pending_reason = null;
    const { error } = await this.client.from('volunteers').update(patch).eq('id', id);
    if (error) throw new Error(`Failed to set volunteer status: ${error.message}`);
  }

  async getTokenVersion(id: string): Promise<number | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select('token_version')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load token version: ${error.message}`);
    return data ? (data as { token_version: number }).token_version : null;
  }

  async bumpTokenVersion(id: string): Promise<number> {
    const current = await this.findById(id);
    if (!current) throw new Error('Volunteer not found');
    const next = current.tokenVersion + 1;
    const { error } = await this.client
      .from('volunteers')
      .update({ token_version: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to bump token version: ${error.message}`);
    return next;
  }
}
