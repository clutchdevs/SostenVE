import { describe, expect, it } from 'vitest';
import { selectVolunteerForCase } from '../../../src/domain/assignment/selection';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer';

function volunteer(id: string, specialty?: string): Volunteer {
  return {
    id,
    fullName: id,
    professionalId: `prof-${id}`,
    specialty,
    role: 'psychologist',
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

describe('selectVolunteerForCase', () => {
  it('returns null when there are no candidates', () => {
    expect(selectVolunteerForCase([], { age: 30 })).toBeNull();
  });

  it('prefers a child specialist for a minor', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'psicología infantil')];
    expect(selectVolunteerForCase(candidates, { age: 10 })?.id).toBe('b');
  });

  it('falls back to any candidate for a minor when no child specialist exists', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'trauma')];
    expect(selectVolunteerForCase(candidates, { age: 10 })?.id).toBe('a');
  });

  it('returns any candidate for an adult', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'infantil')];
    expect(selectVolunteerForCase(candidates, { age: 40 })?.id).toBe('a');
  });

  it('returns any candidate when age is unknown', () => {
    expect(selectVolunteerForCase([volunteer('a')], {})?.id).toBe('a');
  });
});
