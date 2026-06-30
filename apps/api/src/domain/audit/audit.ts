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

/** A persisted audit log row (read model for the admin audit query). */
export interface AuditEntryRecord {
  id: string;
  userId: string | null;
  role: string | null;
  affectedRecordId: string | null;
  actionType: string;
  createdAt: Date;
}

/** Filters for querying the audit log (all optional). */
export interface AuditLogQuery {
  actionType?: string;
  affectedRecordId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

/** Read port for the immutable audit log (admin-only consultation). */
export interface AuditLogReader {
  list(query: AuditLogQuery): Promise<AuditEntryRecord[]>;
}
