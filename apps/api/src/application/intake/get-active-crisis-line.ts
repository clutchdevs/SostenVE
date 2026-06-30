import type { AppConfig } from '../../config';
import type { CrisisLine, CrisisLineRepository } from '../../domain/crisis-line/crisis-line';
import {
  selectActiveCrisisLine,
  type ActiveCrisisLine,
  type BackupLine,
  type RoutingLine,
} from './crisis-line-routing';

/**
 * Returns the crisis line active for the current hour plus the backup lines,
 * read from configuration. Used as the fail-safe fallback when the DB is
 * unavailable, so it stays fast, cacheable and never a single point of failure.
 */
export function getActiveCrisisLine(config: AppConfig, now: Date = new Date()): ActiveCrisisLine {
  return selectActiveCrisisLine(
    config.crisis_lines.routing,
    config.crisis_lines.backup_lines,
    now,
  );
}

/** Lines with an hour window route by hour; lines without hours are backups. */
function splitLines(lines: readonly CrisisLine[]): { routing: RoutingLine[]; backups: BackupLine[] } {
  const routing: RoutingLine[] = [];
  const backups: BackupLine[] = [];
  for (const line of lines) {
    if (line.startHour !== undefined && line.endHour !== undefined) {
      routing.push({
        name: line.name,
        start_hour: line.startHour,
        end_hour: line.endHour,
        phone: line.phone,
      });
    } else {
      backups.push({ name: line.name, phone: line.phone });
    }
  }
  return { routing, backups };
}

/**
 * Active crisis line read from the database (admin-managed source of truth). If
 * the DB is unreachable or has no active lines, falls back to the configured
 * lines so crisis lines are ALWAYS shown (non-negotiable, charter §3). The client
 * also caches the response, adding a second layer of resilience.
 */
export async function getActiveCrisisLineFromDb(
  repo: CrisisLineRepository,
  config: AppConfig,
  now: Date = new Date(),
): Promise<ActiveCrisisLine> {
  try {
    const lines = await repo.listActive();
    if (lines.length === 0) return getActiveCrisisLine(config, now);
    const { routing, backups } = splitLines(lines);
    return selectActiveCrisisLine(routing, backups, now);
  } catch {
    return getActiveCrisisLine(config, now);
  }
}
