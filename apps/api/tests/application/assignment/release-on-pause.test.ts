import { describe, expect, it } from 'vitest';
import { releaseUnacceptedOnPause } from '../../../src/application/assignment/release-on-pause.js';
import { RiskLevel } from '../../../src/domain/triage/index.js';
import type { Assignment } from '../../../src/domain/assignment/assignment.js';
import type { CaseRecord, CaseStatus } from '../../../src/domain/case/case.js';
import type { AssignmentDeps } from '../../../src/application/assignment/ports.js';

const VOLUNTEER = 'psy-1';

function caseRecord(id: string, status: CaseStatus): CaseRecord {
  return {
    id,
    pseudonymId: `pseudo-${id}`,
    branch: 'RED',
    riskLevel: RiskLevel.HIGH,
    urgencyScore: 100,
    status,
    createdAt: new Date(),
  };
}

/** Deps stub: `cases` maps id → status; records the mutations we assert on. */
function deps(cases: Record<string, CaseStatus>, assignments: Assignment[]) {
  const calls = { deleted: [] as string[], status: [] as { id: string; status: string }[] };
  const d = {
    assignments: {
      async findByVolunteerId(volunteerId: string) {
        return volunteerId === VOLUNTEER ? assignments : [];
      },
      async deleteByCaseId(id: string) {
        calls.deleted.push(id);
      },
    },
    cases: {
      async findById(id: string) {
        return cases[id] ? caseRecord(id, cases[id]!) : null;
      },
      async updateStatus(id: string, status: CaseStatus) {
        calls.status.push({ id, status });
      },
    },
  } as unknown as AssignmentDeps;
  return { deps: d, calls };
}

function assignment(caseId: string): Assignment {
  return { id: `a-${caseId}`, caseId, volunteerId: VOLUNTEER, assignedAt: new Date() };
}

describe('releaseUnacceptedOnPause (issue #130)', () => {
  it('returns an assigned-but-unaccepted case to the queue (PENDING)', async () => {
    const { deps: d, calls } = deps({ 'case-1': 'ASSIGNED' }, [assignment('case-1')]);
    const released = await releaseUnacceptedOnPause(VOLUNTEER, d);
    expect(released).toBe(1);
    expect(calls.deleted).toEqual(['case-1']);
    expect(calls.status).toEqual([{ id: 'case-1', status: 'PENDING' }]);
  });

  it('leaves an already-accepted case untouched', async () => {
    const { deps: d, calls } = deps({ 'case-1': 'ACCEPTED' }, [assignment('case-1')]);
    const released = await releaseUnacceptedOnPause(VOLUNTEER, d);
    expect(released).toBe(0);
    expect(calls.deleted).toEqual([]);
    expect(calls.status).toEqual([]);
  });

  it('releases only the unaccepted cases when the psychologist holds several', async () => {
    const { deps: d, calls } = deps(
      { 'case-1': 'ASSIGNED', 'case-2': 'ACCEPTED', 'case-3': 'IN_FOLLOW_UP' },
      [assignment('case-1'), assignment('case-2'), assignment('case-3')],
    );
    const released = await releaseUnacceptedOnPause(VOLUNTEER, d);
    expect(released).toBe(1);
    expect(calls.deleted).toEqual(['case-1']);
    expect(calls.status).toEqual([{ id: 'case-1', status: 'PENDING' }]);
  });

  it('does nothing when the psychologist has no assignments', async () => {
    const { deps: d, calls } = deps({}, []);
    const released = await releaseUnacceptedOnPause(VOLUNTEER, d);
    expect(released).toBe(0);
    expect(calls.deleted).toEqual([]);
  });
});
