import type { AuditEntryRecord, AuditLogQuery, AuditLogReader } from '../../domain/audit/audit';

export interface QueryAuditLogDeps {
  reader: AuditLogReader;
}

/** Admin consultation of the immutable audit log (ADR-0012). */
export function queryAuditLog(
  query: AuditLogQuery,
  deps: QueryAuditLogDeps,
): Promise<AuditEntryRecord[]> {
  return deps.reader.list(query);
}
