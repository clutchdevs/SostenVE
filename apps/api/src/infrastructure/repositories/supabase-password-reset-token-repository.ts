import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NewPasswordResetToken,
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '../../domain/volunteer/password-reset.js';

interface ResetTokenRow {
  id: string;
  volunteer_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

function toDomain(row: ResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    volunteerId: row.volunteer_id,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SupabasePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewPasswordResetToken): Promise<PasswordResetToken> {
    const { data, error } = await this.client
      .from('password_reset_tokens')
      .insert({
        volunteer_id: input.volunteerId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt.toISOString(),
      })
      .select('id, volunteer_id, expires_at, used_at, created_at')
      .single();
    if (error) throw new Error(`Failed to create reset token: ${error.message}`);
    return toDomain(data as ResetTokenRow);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const { data, error } = await this.client
      .from('password_reset_tokens')
      .select('id, volunteer_id, expires_at, used_at, created_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw new Error(`Failed to load reset token: ${error.message}`);
    return data ? toDomain(data as ResetTokenRow) : null;
  }

  async markUsed(id: string): Promise<void> {
    const { error } = await this.client
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to mark reset token used: ${error.message}`);
  }
}
