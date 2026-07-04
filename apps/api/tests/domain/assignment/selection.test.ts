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

  it('prefers a child specialist when the case has childhood tags (RF-1.3), even for an adult requester', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'psicología infantil')];
    // Adult requester (age 35) reporting a child's symptoms → routed to child specialist.
    expect(
      selectVolunteerForCase(candidates, { age: 35, requiresChildSpecialty: true })?.id,
    ).toBe('b');
  });

  it('falls back to any candidate when child specialty is needed but none exists', () => {
    const candidates = [volunteer('a', 'adultos'), volunteer('b', 'trauma')];
    expect(
      selectVolunteerForCase(candidates, { requiresChildSpecialty: true })?.id,
    ).toBe('a');
  });
});
