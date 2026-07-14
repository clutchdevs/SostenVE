import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type {
  CrisisLine,
  CrisisLineRepository,
  CrisisLineUpdate,
  NewCrisisLine,
} from '../../domain/crisis-line/crisis-line.js';

/** Dependencies for the admin crisis-line management use cases. */
export interface CrisisLineDeps {
  lines: CrisisLineRepository;
  audit: AuditLogRepository;
}

export function listCrisisLines(deps: CrisisLineDeps): Promise<CrisisLine[]> {
  return deps.lines.listAll();
}

export async function createCrisisLine(
  input: NewCrisisLine,
  adminId: string,
  deps: CrisisLineDeps,
): Promise<CrisisLine> {
  const line = await deps.lines.create(input);
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: line.id,
    actionType: 'crisis_line_created',
  });
  return line;
}

export async function updateCrisisLine(
  id: string,
  patch: CrisisLineUpdate,
  adminId: string,
  deps: CrisisLineDeps,
): Promise<CrisisLine> {
  const line = await deps.lines.update(id, patch);
  if (!line) throw new ApiError(404, 'NOT_FOUND', 'Crisis line not found');
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: id,
    actionType: 'crisis_line_updated',
  });
  return line;
}

/**
 * Hard-delete: permanently removes the line (irreversible). The reversible
 * soft-delete is `updateCrisisLine(id, { active: false })` (the "Desactivar"
 * action), which just hides it from routing.
 */
export async function deleteCrisisLine(
  id: string,
  adminId: string,
  deps: CrisisLineDeps,
): Promise<void> {
  const deleted = await deps.lines.delete(id);
  if (!deleted) throw new ApiError(404, 'NOT_FOUND', 'Crisis line not found');
  await deps.audit.append({
    userId: adminId,
    role: 'admin',
    affectedRecordId: id,
    actionType: 'crisis_line_deleted',
  });
}
