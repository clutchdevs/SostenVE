import type { AuditLogQuery, AuditLogReader, AuditPage } from '../../domain/audit/audit';

export interface QueryAuditLogDeps {
  reader: AuditLogReader;
}

/** Admin consultation of the immutable audit log (ADR-0012). */
export function queryAuditLog(query: AuditLogQuery, deps: QueryAuditLogDeps): Promise<AuditPage> {
  return deps.reader.list(query);
}
