import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NewVolunteer,
  Volunteer,
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
  role: string;
  token_version: number;
  status: string;
  created_at: string;
}

function toDomain(row: VolunteerRow): Volunteer {
  return {
    id: row.id,
    fullName: row.full_name,
    professionalId: row.professional_id,
    email: row.email ?? undefined,
    specialty: row.specialty ?? undefined,
    availability: row.availability ?? undefined,
    role: row.role as VolunteerRole,
    tokenVersion: row.token_version,
    status: row.status as VolunteerStatus,
    createdAt: new Date(row.created_at),
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

  async getPasswordHash(id: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('volunteers')
      .select('password_hash')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load credentials: ${error.message}`);
    return data ? (data as { password_hash: string }).password_hash : null;
  }

  async setStatus(id: string, status: VolunteerStatus): Promise<void> {
    const { error } = await this.client
      .from('volunteers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to set volunteer status: ${error.message}`);
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
