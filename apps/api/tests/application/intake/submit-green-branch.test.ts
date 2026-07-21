import { describe, expect, it, vi } from 'vitest';
import { submitGreenBranch } from '../../../src/application/intake/submit-green-branch.js';
import type { IntakeDeps } from '../../../src/application/intake/types.js';
import type { CaseRecord } from '../../../src/domain/case/case.js';

function deps(): { deps: IntakeDeps; upsert: ReturnType<typeof vi.fn> } {
  const upsert = vi.fn(async () => undefined);
  const deps = {
    cases: {
      create: async () => ({ id: 'case-1', urgencyScore: 1 }) as CaseRecord,
    },
    contacts: { upsert, findByPseudonymId: async () => null },
    config: {
      triage: { orange_tags_threshold_for_escalation: 3, likert_critical_option: 1 },
      sla: { high_risk_assignment_minutes: 15 },
      crisis_lines: { routing: [], backup_lines: [] },
      service: { modality: 'distancia' },
    },
    pseudonymSalt: 'salt',
  } as unknown as IntakeDeps;
  return { deps, upsert };
}

// Issue #129: the stored contact must be international format (58...) so the
// assigned psychologist's wa.me link works, regardless of how the requester
// typed it.
describe('submitGreenBranch — contact normalization (issue #129)', () => {
  it('stores the contact in international format when given national (0-prefixed) format', async () => {
    const { deps: d, upsert } = deps();
    await submitGreenBranch(
      { contact: '0414-1234567', tagCodes: ['acute_insomnia'] },
      d,
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ contact: '584141234567' }),
    );
  });

  it('is idempotent when already given international format', async () => {
    const { deps: d, upsert } = deps();
    await submitGreenBranch(
      { contact: '+58 414 123 4567', tagCodes: ['acute_insomnia'] },
      d,
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ contact: '584141234567' }),
    );
  });
});
