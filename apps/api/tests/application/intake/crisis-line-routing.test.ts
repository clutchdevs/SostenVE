import { describe, expect, it } from 'vitest';
import { selectActiveCrisisLine } from '../../../src/application/intake/crisis-line-routing.js';

const routing = [
  { name: 'LAPSI', start_hour: 8, end_hour: 26, phone: '+584242907338' },
  { name: 'Colegio de Psicólogos de Miranda', start_hour: 2, end_hour: 8, phone: '04127840112' },
];
const backups = [{ name: 'VEN-911', phone: '911' }];

function at(hour: number): Date {
  return new Date(2026, 5, 24, hour, 0, 0);
}

describe('selectActiveCrisisLine (RF-1.2.1)', () => {
  it('returns LAPSI during its daytime range', () => {
    expect(selectActiveCrisisLine(routing, backups, at(10)).active?.name).toBe('LAPSI');
  });

  it('returns Miranda during the early-morning range', () => {
    expect(selectActiveCrisisLine(routing, backups, at(3)).active?.name).toContain('Miranda');
  });

  it('handles the midnight crossing (1 AM is still LAPSI)', () => {
    expect(selectActiveCrisisLine(routing, backups, at(1)).active?.name).toBe('LAPSI');
  });

  it('always returns the backup lines', () => {
    expect(selectActiveCrisisLine(routing, backups, at(15)).backups).toEqual(backups);
  });
});
