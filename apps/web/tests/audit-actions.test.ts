import { describe, expect, it } from 'vitest';
import { describeAction, roleLabel } from '../src/features/admin/audit-actions';

describe('describeAction', () => {
  it('translates a known action to human Spanish', () => {
    const d = describeAction('crisis_line_updated');
    expect(d.label).toBe('Línea de crisis actualizada');
    expect(d.tone).toBe('neutral');
    expect(d.raw).toBe('crisis_line_updated');
  });

  it('maps the registration outcome suffix to a friendly detail', () => {
    expect(describeAction('volunteer_registered:active').detail).toBe('Activado');
    expect(describeAction('volunteer_registered:pending_approval').detail).toBe('En revisión');
  });

  it('keeps an unknown suffix as the detail (e.g. consent version)', () => {
    const d = describeAction('consent_accepted:v0.1.0-draft');
    expect(d.label).toBe('Consentimiento informado aceptado');
    expect(d.detail).toBe('v0.1.0-draft');
  });

  it('humanizes an unknown action instead of showing the raw code', () => {
    expect(describeAction('some_new_event').label).toBe('Some new event');
  });
});

describe('roleLabel', () => {
  it('translates roles and defaults null to Sistema', () => {
    expect(roleLabel('psychologist')).toBe('Psicólogo/a');
    expect(roleLabel('admin')).toBe('Administrador/a');
    expect(roleLabel(null)).toBe('Sistema');
  });
});
