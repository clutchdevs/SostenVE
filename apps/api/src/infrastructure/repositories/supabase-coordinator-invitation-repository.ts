import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CoordinatorInvitation,
  CoordinatorInvitationRepository,
  InvitationStatus,
  NewCoordinatorInvitation,
} from '../../domain/coordinator/invitation.js';

interface InvitationRow {
  id: string;
  email: string;
  full_name: string;
  status: string;
  invited_by: string | null;
  volunteer_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

function toDomain(row: InvitationRow): CoordinatorInvitation {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: row.status as InvitationStatus,
    invitedBy: row.invited_by ?? undefined,
    volunteerId: row.volunteer_id ?? undefined,
    expiresAt: new Date(row.expires_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseCoordinatorInvitationRepository implements CoordinatorInvitationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewCoordinatorInvitation): Promise<CoordinatorInvitation> {
    const { data, error } = await this.client
      .from('coordinator_invitations')
      .insert({
        email: input.email,
        full_name: input.fullName,
        token_hash: input.tokenHash,
        invited_by: input.invitedBy,
        expires_at: input.expiresAt.toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create invitation: ${error.message}`);
    return toDomain(data as InvitationRow);
  }

  async list(): Promise<CoordinatorInvitation[]> {
    const { data, error } = await this.client
      .from('coordinator_invitations')
      .select('id, email, full_name, status, invited_by, volunteer_id, expires_at, accepted_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list invitations: ${error.message}`);
    return (data as InvitationRow[]).map(toDomain);
  }

  async findById(id: string): Promise<CoordinatorInvitation | null> {
    const { data, error } = await this.client
      .from('coordinator_invitations')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load invitation: ${error.message}`);
    return data ? toDomain(data as InvitationRow) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<CoordinatorInvitation | null> {
    const { data, error } = await this.client
      .from('coordinator_invitations')
      .select()
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw new Error(`Failed to load invitation: ${error.message}`);
    return data ? toDomain(data as InvitationRow) : null;
  }

  async markAccepted(id: string, volunteerId: string): Promise<void> {
    const { error } = await this.client
      .from('coordinator_invitations')
      .update({
        status: 'accepted',
        volunteer_id: volunteerId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(`Failed to mark invitation accepted: ${error.message}`);
  }

  async revoke(id: string): Promise<CoordinatorInvitation> {
    const { data, error } = await this.client
      .from('coordinator_invitations')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to revoke invitation: ${error.message}`);
    return toDomain(data as InvitationRow);
  }
}
