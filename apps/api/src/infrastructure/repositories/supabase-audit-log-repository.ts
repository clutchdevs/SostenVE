import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditEntry, AuditLogRepository } from '../../domain/audit/audit';

/**
 * Append-only audit log adapter (ADR-0012). Only inserts; the DB rejects any
 * UPDATE/DELETE via RLS and a trigger.
 */
export class SupabaseAuditLogRepository implements AuditLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async append(entry: AuditEntry): Promise<void> {
    const { error } = await this.client.from('audit_log').insert({
      user_id: entry.userId ?? null,
      role: entry.role ?? null,
      affected_record_id: entry.affectedRecordId ?? null,
      action_type: entry.actionType,
    });
    if (error) throw new Error(`Failed to append audit entry: ${error.message}`);
  }
}
