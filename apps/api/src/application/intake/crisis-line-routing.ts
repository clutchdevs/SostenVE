/**
 * Crisis-line hour routing (RF-1.2.1). Pure function over the configured routing
 * table so it is deterministic and testable. Hours are real clock hours (0–24).
 *
 * A window `[start, end)` with `start < end` covers the same calendar day. A
 * window that CROSSES MIDNIGHT is expressed with `end <= start` (e.g. a line from
 * 20:00 to 02:00 is `start=20, end=2`): it is active in the evening on the day the
 * shift starts and in the early hours of the following day.
 *
 * `days` (issue #127) restricts a line to the days it operates, matched on the day
 * the shift STARTS: a Monday-only overnight line (e.g. 20 -> 2) also covers early
 * Tuesday morning without listing Tuesday. `days` undefined means every day,
 * matching every line created before this field existed.
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

// Crisis-line schedules are configured in Venezuelan local time (America/Caracas,
// UTC-4, no DST). Route against THAT wall clock, not the server's timezone (which
// is UTC on containers/serverless) — otherwise an "8:00–14:00" line would be off
// by the server's offset.
const CARACAS_TZ = 'America/Caracas';
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function caracasHourAndDay(now: Date): { hour: number; dayIndex: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CARACAS_TZ,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const dayIndex = WEEKDAY_INDEX[parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'] ?? 0;
  return { hour, dayIndex };
}

function operatesOn(days: string[] | undefined, dayIndex: number): boolean {
  return days === undefined || days.includes(DAY_NAMES[dayIndex] ?? '');
}

function covers(line: RoutingLine, hour: number, dayIndex: number): boolean {
  if (line.start_hour < line.end_hour) {
    // Same-day window: [start, end) on an operating day.
    return hour >= line.start_hour && hour < line.end_hour && operatesOn(line.days, dayIndex);
  }
  // Overnight window (end <= start): active in the evening on the day the shift
  // starts, and in the early hours of the following day (carried over from it).
  const yesterday = (dayIndex + 6) % 7;
  const eveningStartDay = hour >= line.start_hour && operatesOn(line.days, dayIndex);
  const morningNextDay = hour < line.end_hour && operatesOn(line.days, yesterday);
  return eveningStartDay || morningNextDay;
}

export function selectActiveCrisisLine(
  routing: readonly RoutingLine[],
  backups: readonly BackupLine[],
  now: Date = new Date(),
): ActiveCrisisLine {
  const { hour, dayIndex } = caracasHourAndDay(now);
  // ALL scheduled lines that apply right now (not just the first): the highest
  // priority one is the "call now" line, the rest are listed alongside. Lines are
  // expected pre-sorted by priority. Hourless lines always operate (subject to
  // their days) and are shown as backups.
  const applicable = routing.filter((line) => covers(line, hour, dayIndex));
  const [active, ...alsoActive] = applicable;
  const openBackups = backups.filter((line) => operatesOn(line.days, dayIndex));
  return {
    active: active ? { name: active.name, phone: active.phone } : null,
    backups: [
      ...alsoActive.map((line) => ({ name: line.name, phone: line.phone, days: line.days })),
      ...openBackups,
    ],
  };
}
