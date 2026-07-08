import { describe, expect, it } from 'vitest';
import { getActiveCrisisLineFromDb } from '../../../src/application/intake/get-active-crisis-line.js';
import type { AppConfig } from '../../../src/config/index.js';
import type { CrisisLine, CrisisLineRepository } from '../../../src/domain/crisis-line/crisis-line.js';

const config = {
  crisis_lines: {
    routing: [{ name: 'CONFIG-LINE', start_hour: 0, end_hour: 24, phone: '000' }],
    backup_lines: [{ name: 'CONFIG-BACKUP', phone: '911' }],
  },
} as unknown as AppConfig;

function at(hour: number): Date {
  return new Date(2026, 5, 24, hour, 0, 0);
}

function repoWith(lines: CrisisLine[]): CrisisLineRepository {
  return {
    listActive: async () => lines,
    listAll: async () => lines,
    create: async () => lines[0]!,
    update: async () => lines[0]!,
    deactivate: async () => lines[0]!,
  };
}

const dbLines: CrisisLine[] = [
  { id: '1', name: 'LAPSI', phone: '+58', startHour: 8, endHour: 26, priority: 10, active: true },
  { id: '2', name: 'Miranda', phone: '04', startHour: 2, endHour: 8, priority: 9, active: true },
  { id: '3', name: 'VEN-911', phone: '911', priority: 1, active: true },
];

describe('getActiveCrisisLineFromDb', () => {
  it('routes by hour from DB lines and exposes hourless lines as backups', async () => {
    const result = await getActiveCrisisLineFromDb(repoWith(dbLines), config, at(10));
    expect(result.active?.name).toBe('LAPSI');
    expect(result.backups).toEqual([{ name: 'VEN-911', phone: '911' }]);
  });

  it('falls back to config when the DB has no active lines', async () => {
    const result = await getActiveCrisisLineFromDb(repoWith([]), config, at(10));
    expect(result.active?.name).toBe('CONFIG-LINE');
    expect(result.backups).toEqual([{ name: 'CONFIG-BACKUP', phone: '911' }]);
  });

  it('falls back to config when the DB throws (fail-safe)', async () => {
    const failing: CrisisLineRepository = {
      ...repoWith([]),
      listActive: async () => {
        throw new Error('db down');
      },
    };
    const result = await getActiveCrisisLineFromDb(failing, config, at(10));
    expect(result.active?.name).toBe('CONFIG-LINE');
  });
});
