import type { AppConfig } from '../../config';
import { selectActiveCrisisLine, type ActiveCrisisLine } from './crisis-line-routing';

/**
 * Returns the crisis line active for the current hour plus the backup lines,
 * read from configuration (never the database) so it stays fast and cacheable and
 * is not a single point of failure for showing crisis lines.
 */
export function getActiveCrisisLine(config: AppConfig, now: Date = new Date()): ActiveCrisisLine {
  return selectActiveCrisisLine(
    config.crisis_lines.routing,
    config.crisis_lines.backup_lines,
    now,
  );
}
