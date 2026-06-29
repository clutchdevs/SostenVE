/**
 * Immutable audit log entry and repository port (ADR-0012). Only appends are
 * allowed; the DB enforces immutability via RLS + a trigger.
 */
export interface AuditEntry {
  userId?: string;
  role?: string;
  affectedRecordId?: string;
  actionType: string;
}

export interface AuditLogRepository {
  append(entry: AuditEntry): Promise<void>;
}
