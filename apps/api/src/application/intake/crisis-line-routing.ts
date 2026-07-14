/**
 * Crisis-line hour routing (RF-1.2.1). Pure function over the configured routing
 * table so it is deterministic and testable. An entry covers an hour `h` when
 * `start <= h < end` or `start <= h + 24 < end`, which handles ranges that cross
 * midnight (e.g. LAPSI 8 -> 26, i.e. 8:00 to 02:00 next day).
 *
 * `days` (issue #127) restricts a line to the days it operates, using the day
 * the shift STARTS: a Monday-only line with an overnight window (e.g. 20 -> 26)
 * also covers early Tuesday morning without listing Tuesday. `days` undefined
 * means every day, matching every line created before this field existed.
 */
export interface RoutingLine {
  name: string;
  start_hour: number;
  end_hour: number;
  phone: string;
  days?: string[];
}

export interface BackupLine {
  name: string;
  phone: string;
  days?: string[];
}

export interface ActiveCrisisLine {
  active: { name: string; phone: string } | null;
  backups: BackupLine[];
}

/** Sunday=0..Saturday=6, matching Date#getDay(). */
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function operatesOn(days: string[] | undefined, dayIndex: number): boolean {
  return days === undefined || days.includes(DAY_NAMES[dayIndex] ?? '');
}

function covers(line: RoutingLine, hour: number, dayIndex: number): boolean {
  const startsToday =
    hour >= line.start_hour && hour < line.end_hour && operatesOn(line.days, dayIndex);
  const startedYesterday =
    hour + 24 >= line.start_hour &&
    hour + 24 < line.end_hour &&
    operatesOn(line.days, (dayIndex + 6) % 7);
  return startsToday || startedYesterday;
}

export function selectActiveCrisisLine(
  routing: readonly RoutingLine[],
  backups: readonly BackupLine[],
  now: Date = new Date(),
): ActiveCrisisLine {
  const hour = now.getHours();
  const dayIndex = now.getDay();
  const match = routing.find((line) => covers(line, hour, dayIndex));
  return {
    active: match ? { name: match.name, phone: match.phone } : null,
    backups: backups.filter((line) => operatesOn(line.days, dayIndex)),
  };
}
