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

// 2026-06-24 is a Wednesday; 2026-06-25 is a Thursday.
function atDay(day: number, hour: number): Date {
  return new Date(2026, 5, day, hour, 0, 0);
}

describe('selectActiveCrisisLine days-of-week (issue #127)', () => {
  const wednesdayOnly = [
    { name: 'Wednesday line', start_hour: 20, end_hour: 26, phone: '1', days: ['miercoles'] },
  ];

  it('matches on the day it starts', () => {
    expect(selectActiveCrisisLine(wednesdayOnly, [], atDay(24, 21)).active?.name).toBe(
      'Wednesday line',
    );
  });

  it('does not match on a day not listed', () => {
    expect(selectActiveCrisisLine(wednesdayOnly, [], atDay(25, 21)).active).toBeNull();
  });

  it('still matches early the next morning without listing that day (overnight carry-over)', () => {
    expect(selectActiveCrisisLine(wednesdayOnly, [], atDay(25, 1)).active?.name).toBe(
      'Wednesday line',
    );
  });

  it('stops matching once the next day moves past its own start hour', () => {
    // Thursday 21:00 is NOT covered by a Wednesday-only 20->26 window.
    expect(selectActiveCrisisLine(wednesdayOnly, [], atDay(25, 21)).active).toBeNull();
  });

  it('filters backup lines by day too', () => {
    const backupsWithDays = [
      { name: 'Weekday backup', phone: '2', days: ['miercoles'] },
      { name: 'Always backup', phone: '3' },
    ];
    const result = selectActiveCrisisLine([], backupsWithDays, atDay(25, 12));
    expect(result.backups).toEqual([{ name: 'Always backup', phone: '3' }]);
  });
});
