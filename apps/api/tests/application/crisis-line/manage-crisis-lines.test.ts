import { describe, expect, it, vi } from 'vitest';
import {
  createCrisisLine,
  deactivateCrisisLine,
  updateCrisisLine,
} from '../../../src/application/crisis-line/manage-crisis-lines';
import type { CrisisLineDeps } from '../../../src/application/crisis-line/manage-crisis-lines';
import type { CrisisLine } from '../../../src/domain/crisis-line/crisis-line';

const line: CrisisLine = {
  id: 'cl-1',
  name: 'LAPSI',
  phone: '+58',
  priority: 0,
  active: true,
};

function deps(overrides: Partial<CrisisLineDeps['lines']> = {}): {
  deps: CrisisLineDeps;
  append: ReturnType<typeof vi.fn>;
} {
  const append = vi.fn(async () => undefined);
  return {
    append,
    deps: {
      audit: { append },
      lines: {
        create: vi.fn(async () => line),
        update: vi.fn(async () => line),
        deactivate: vi.fn(async () => line),
        listActive: vi.fn(async () => [line]),
        listAll: vi.fn(async () => [line]),
        ...overrides,
      },
    },
  };
}

describe('manage-crisis-lines (audited)', () => {
  it('audits a creation', async () => {
    const { deps: d, append } = deps();
    await createCrisisLine({ name: 'LAPSI', phone: '+58' }, 'admin-1', d);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'crisis_line_created', userId: 'admin-1', role: 'admin' }),
    );
  });

  it('audits an update', async () => {
    const { deps: d, append } = deps();
    await updateCrisisLine('cl-1', { active: false }, 'admin-1', d);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'crisis_line_updated', affectedRecordId: 'cl-1' }),
    );
  });

  it('audits a soft-delete', async () => {
    const { deps: d, append } = deps();
    await deactivateCrisisLine('cl-1', 'admin-1', d);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'crisis_line_deleted', affectedRecordId: 'cl-1' }),
    );
  });

  it('throws 404 when updating a missing line and does not audit', async () => {
    const { deps: d, append } = deps({ update: vi.fn(async () => null) });
    await expect(updateCrisisLine('missing', { phone: 'x' }, 'admin-1', d)).rejects.toMatchObject({
      status: 404,
    });
    expect(append).not.toHaveBeenCalled();
  });
});
