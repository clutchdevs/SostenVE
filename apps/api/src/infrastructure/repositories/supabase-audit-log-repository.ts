import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditEntry,
  AuditLogQuery,
  AuditLogReader,
  AuditLogRepository,
  AuditPage,
} from '../../domain/audit/audit';

interface AuditRow {
  id: string;
  user_id: string | null;
  role: string | null;
  affected_record_id: string | null;
  action_type: string;
  created_at: string;
}

interface ActorRow {
  id: string;
  full_name: string;
  professional_id: string;
  document_type: string | null;
  document_number: string | null;
}

/**
 * National ID (cédula) when on file, else the FPV credential — a stable
 * distinguisher for actors who share a name.
 */
function actorCedula(actor: ActorRow): string {
  if (actor.document_number) {
    return actor.document_type
      ? `${actor.document_type}-${actor.document_number}`
      : actor.document_number;
  }
  return actor.professional_id;
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

  async list(query: AuditLogQuery): Promise<AuditPage> {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset ?? 0;
    // `count: 'exact'` returns the total matching the filters (for pagination).
    let q = this.client
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (query.actionType) q = q.eq('action_type', query.actionType);
    if (query.affectedRecordId) q = q.eq('affected_record_id', query.affectedRecordId);
    if (query.userId) q = q.eq('user_id', query.userId);

    const { data, error, count } = await q;
    if (error) throw new Error(`Failed to query audit log: ${error.message}`);
    const rows = data as AuditRow[];

    // Resolve actor names/cédulas in one extra query (audit_log stores only the id).
    const actors = await this.loadActors(rows);
    const entries = rows.map((row) => {
      const actor = row.user_id ? actors.get(row.user_id) : undefined;
      return {
        id: row.id,
        userId: row.user_id,
        userName: actor?.full_name ?? null,
        userCedula: actor ? actorCedula(actor) : null,
        role: row.role,
        affectedRecordId: row.affected_record_id,
        actionType: row.action_type,
        createdAt: new Date(row.created_at),
      };
    });
    return { entries, total: count ?? entries.length };
  }

  /** Looks up the actors referenced by a page of audit rows, keyed by id. */
  private async loadActors(rows: AuditRow[]): Promise<Map<string, ActorRow>> {
    const ids = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();
    const { data, error } = await this.client
      .from('volunteers')
      .select('id, full_name, professional_id, document_type, document_number')
      .in('id', ids);
    if (error) throw new Error(`Failed to resolve audit actors: ${error.message}`);
    return new Map((data as ActorRow[]).map((a) => [a.id, a]));
  }
}
