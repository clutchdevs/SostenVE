import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditEntry,
  AuditEntryRecord,
  AuditLogQuery,
  AuditLogReader,
  AuditLogRepository,
} from '../../domain/audit/audit';

interface AuditRow {
  id: string;
  user_id: string | null;
  role: string | null;
  affected_record_id: string | null;
  action_type: string;
  created_at: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Append-only audit log adapter (ADR-0012). Inserts are append-only (the DB
 * rejects UPDATE/DELETE via RLS and a trigger); `list` is the admin read model.
 */
export class SupabaseAuditLogRepository implements AuditLogRepository, AuditLogReader {
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

  async list(query: AuditLogQuery): Promise<AuditEntryRecord[]> {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset ?? 0;
    let q = this.client
      .from('audit_log')
      .select()
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (query.actionType) q = q.eq('action_type', query.actionType);
    if (query.affectedRecordId) q = q.eq('affected_record_id', query.affectedRecordId);
    if (query.userId) q = q.eq('user_id', query.userId);

    const { data, error } = await q;
    if (error) throw new Error(`Failed to query audit log: ${error.message}`);
    return (data as AuditRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      affectedRecordId: row.affected_record_id,
      actionType: row.action_type,
      createdAt: new Date(row.created_at),
    }));
  }
}
