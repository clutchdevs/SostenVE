import { describe, expect, it } from 'vitest';
import { selectVolunteerForCase } from '../../../src/domain/assignment/selection';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer';

function volunteer(id: string, specialty?: string, colegio?: string): Volunteer {
  return {
    id,
    fullName: id,
    professionalId: `prof-${id}`,
    specialty,
    colegio,
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

  it('prefers a same-region volunteer (RF-3.1), matching the state within the Colegio', () => {
    const candidates = [
      volunteer('a', undefined, 'Colegio de Psicólogos de Lara'),
      volunteer('b', undefined, 'Colegio de Psicólogos de Miranda'),
    ];
    // Accent-insensitive: case region "Miranda" matches volunteer b's colegio.
    expect(selectVolunteerForCase(candidates, { region: 'Miranda' })?.id).toBe('b');
  });

  it('does not strand a case when no volunteer is in the region', () => {
    const candidates = [
      volunteer('a', undefined, 'Colegio de Psicólogos de Lara'),
      volunteer('b', undefined, 'Colegio de Psicólogos de Zulia'),
    ];
    expect(selectVolunteerForCase(candidates, { region: 'Falcón' })?.id).toBe('a');
  });

  it('combines clinical fit and region: a child specialist in-region wins', () => {
    const candidates = [
      volunteer('a', 'psicología infantil', 'Colegio de Lara'),
      volunteer('b', 'psicología infantil', 'Colegio de Miranda'),
      volunteer('c', 'adultos', 'Colegio de Miranda'),
    ];
    // Needs a child specialist AND prefers Miranda → b (child specialist in Miranda).
    expect(
      selectVolunteerForCase(candidates, { requiresChildSpecialty: true, region: 'Miranda' })?.id,
    ).toBe('b');
  });
});
