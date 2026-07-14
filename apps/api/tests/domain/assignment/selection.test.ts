import { describe, expect, it } from 'vitest';
import { selectVolunteerForCase } from '../../../src/domain/assignment/selection.js';
import type { LoadContext } from '../../../src/domain/assignment/selection.js';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer.js';

function volunteer(id: string, specialty?: string): Volunteer {
  return {
    id,
    fullName: id,
    professionalId: `prof-${id}`,
    specialty,
    role: 'psychologist',
    roles: ['psychologist'],
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

/** Everyone idle (load 0), generous cap — isolates the clinical-fit rules. */
const IDLE: LoadContext = { caseloadOf: () => 0, maxCaseload: 6 };

function load(map: Record<string, number>, maxCaseload = 6): LoadContext {
  return { caseloadOf: (id: string) => map[id] ?? 0, maxCaseload };
}

describe('selectVolunteerForCase — clinical fit (RF-1.3)', () => {
  it('returns null when there are no candidates', () => {
    expect(selectVolunteerForCase([], { age: 30 }, IDLE)).toBeNull();
  });

  it('prefers a child specialist for a minor', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'psicología infantil')];
    expect(selectVolunteerForCase(candidates, { age: 10 }, IDLE)?.id).toBe('b');
  });

  it('falls back to any candidate for a minor when no child specialist exists', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'trauma')];
    expect(selectVolunteerForCase(candidates, { age: 10 }, IDLE)?.id).toBe('a');
  });

  it('returns any candidate for an adult', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'infantil')];
    expect(selectVolunteerForCase(candidates, { age: 40 }, IDLE)?.id).toBe('a');
  });

  it('returns any candidate when age is unknown', () => {
    expect(selectVolunteerForCase([volunteer('a')], {}, IDLE)?.id).toBe('a');
  });

  it('prefers a child specialist when the case has childhood tags, even for an adult requester', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'psicología infantil')];
    expect(
      selectVolunteerForCase(candidates, { age: 35, requiresChildSpecialty: true }, IDLE)?.id,
    ).toBe('b');
  });

  it('falls back to any candidate when child specialty is needed but none exists', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'trauma')];
    expect(selectVolunteerForCase(candidates, { requiresChildSpecialty: true }, IDLE)?.id).toBe('a');
  });
});

describe('selectVolunteerForCase — load balancing (RF-2.5)', () => {
  const two = [volunteer('a'), volunteer('b')];

  it('picks the least-loaded volunteer', () => {
    expect(selectVolunteerForCase(two, {}, load({ a: 3, b: 1 }))?.id).toBe('b');
    expect(selectVolunteerForCase(two, {}, load({ a: 0, b: 2 }))?.id).toBe('a');
  });

  it('skips a volunteer already at the cap', () => {
    // a is full (6/6); b has room → b, even though a is first in the list.
    expect(selectVolunteerForCase(two, {}, load({ a: 6, b: 2 }, 6))?.id).toBe('b');
  });

  it('returns null when every candidate is at the cap (non-high-risk case queues)', () => {
    expect(selectVolunteerForCase(two, {}, load({ a: 6, b: 6 }, 6))).toBeNull();
  });

  it('sends an urgent case to an under-cap volunteer before overloading a full one', () => {
    // 5 psychologists: 4 are already at the cap (6), 1 still has room (3). An urgent
    // (high-risk) case must go to the one under the cap — NOT overload a full one.
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => volunteer(id));
    const loads = load({ a: 6, b: 6, c: 3, d: 6, e: 6 }, 6);
    expect(selectVolunteerForCase(five, { highRisk: true }, loads)?.id).toBe('c');
  });

  it('only overloads (exceeds cap) once EVERY volunteer is at the cap', () => {
    // All at/over the cap → the crisis is never stranded: least-loaded is overloaded.
    const three = ['a', 'b', 'c'].map((id) => volunteer(id));
    expect(selectVolunteerForCase(three, { highRisk: true }, load({ a: 7, b: 6, c: 8 }, 6))?.id).toBe(
      'b',
    );
  });

  it('balances within the child-specialist pool too', () => {
    const specialists = [volunteer('a', 'infantil'), volunteer('b', 'psicología infantil')];
    // Minor case: prefer a child specialist AND the least-loaded of them.
    expect(selectVolunteerForCase(specialists, { age: 8 }, load({ a: 4, b: 1 }))?.id).toBe('b');
  });
});
