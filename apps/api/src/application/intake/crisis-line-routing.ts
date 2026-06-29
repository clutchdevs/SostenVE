/**
 * Crisis-line hour routing (RF-1.2.1). Pure function over the configured routing
 * table so it is deterministic and testable. An entry covers an hour `h` when
 * `start <= h < end` or `start <= h + 24 < end`, which handles ranges that cross
 * midnight (e.g. LAPSI 8 -> 26, i.e. 8:00 to 02:00 next day).
 */
export interface RoutingLine {
  name: string;
  start_hour: number;
  end_hour: number;
  phone: string;
}

export interface BackupLine {
  name: string;
  phone: string;
}

export interface ActiveCrisisLine {
  active: { name: string; phone: string } | null;
  backups: BackupLine[];
}

function covers(line: RoutingLine, hour: number): boolean {
  return (
    (hour >= line.start_hour && hour < line.end_hour) ||
    (hour + 24 >= line.start_hour && hour + 24 < line.end_hour)
  );
}

export function selectActiveCrisisLine(
  routing: readonly RoutingLine[],
  backups: readonly BackupLine[],
  now: Date = new Date(),
): ActiveCrisisLine {
  const hour = now.getHours();
  const match = routing.find((line) => covers(line, hour));
  return {
    active: match ? { name: match.name, phone: match.phone } : null,
    backups: [...backups],
  };
}
