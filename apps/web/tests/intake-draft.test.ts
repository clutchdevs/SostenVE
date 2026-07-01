import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, INTAKE_DRAFT_KEYS, loadDraft, saveDraft } from '../src/lib/intake-draft';

describe('intake draft persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips a draft through storage (survives a reload)', () => {
    saveDraft(INTAKE_DRAFT_KEYS.verde, { step: 2, form: { contact: '0412' } });
    const draft = loadDraft<{ step: number; form: { contact: string } }>(INTAKE_DRAFT_KEYS.verde);
    expect(draft?.step).toBe(2);
    expect(draft?.form.contact).toBe('0412');
  });

  it('returns null when there is no draft', () => {
    expect(loadDraft(INTAKE_DRAFT_KEYS.roja)).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    window.localStorage.setItem(INTAKE_DRAFT_KEYS.roja, '{not json');
    expect(loadDraft(INTAKE_DRAFT_KEYS.roja)).toBeNull();
  });

  it('clears a draft', () => {
    saveDraft(INTAKE_DRAFT_KEYS.roja, { contact: '0412' });
    clearDraft(INTAKE_DRAFT_KEYS.roja);
    expect(loadDraft(INTAKE_DRAFT_KEYS.roja)).toBeNull();
  });
});
