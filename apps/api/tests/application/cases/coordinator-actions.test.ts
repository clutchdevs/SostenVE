import { describe, expect, it } from 'vitest';
import { getConfig } from '../../../src/config';
import {
  coordinatorCloseCase,
  reassignCase,
} from '../../../src/application/cases/coordinator-actions';
import { RiskLevel } from '../../../src/domain/triage';
import type { CaseRecord } from '../../../src/domain/case/case';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer';

const ACTOR = { id: 'coord-1', role: 'coordinator' };

function caseRecord(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: 'case-1',
    pseudonymId: 'pseudo-1',
    branch: 'RED',
    riskLevel: RiskLevel.HIGH,
    urgencyScore: 100,
    status: 'ASSIGNED',
    createdAt: new Date(),
    ...over,
  };
}

function psychologist(over: Partial<Volunteer> = {}): Volunteer {
  return {
    id: 'psy-1',
    fullName: 'Dra. Pérez',
    professionalId: 'FPV-1',
    role: 'psychologist',
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
    ...over,
  };
}

function reassignDeps(theCase: CaseRecord | null, target: Volunteer | null) {
  const calls = {
    deleted: [] as string[],
    created: [] as { caseId: string; volunteerId: string }[],
    status: [] as string[],
    sla: [] as (Date | null)[],
    notified: [] as string[],
    audit: [] as string[],
  };
  const deps = {
    cases: {
      async findById() {
        return theCase;
      },
      async updateStatus(_id: string, s: string) {
        calls.status.push(s);
      },
      async updateSlaExpiresAt(_id: string, d: Date | null) {
        calls.sla.push(d);
      },
    },
    assignments: {
      async deleteByCaseId(id: string) {
        calls.deleted.push(id);
      },
      async create(input: { caseId: string; volunteerId: string }) {
        calls.created.push(input);
        return { id: 'a1', caseId: input.caseId, volunteerId: input.volunteerId, assignedAt: new Date() };
      },
    },
    volunteers: {
      async findById() {
        return target;
      },
    },
    notifier: {
      async notifyAssigned(i: { volunteerId: string }) {
        calls.notified.push(i.volunteerId);
      },
      async notifyEscalated() {},
    },
    audit: {
      async append(e: { actionType: string }) {
        calls.audit.push(e.actionType);
      },
    },
    config: getConfig(),
  } as unknown as Parameters<typeof reassignCase>[3];
  return { deps, calls };
}

describe('reassignCase', () => {
  it('reassigns to an active psychologist, resets the SLA for high risk and audits', async () => {
    const { deps, calls } = reassignDeps(caseRecord(), psychologist());
    await reassignCase('case-1', 'psy-1', ACTOR, deps);
    expect(calls.deleted).toEqual(['case-1']);
    expect(calls.created).toEqual([{ caseId: 'case-1', volunteerId: 'psy-1' }]);
    expect(calls.status).toEqual(['ASSIGNED']);
    expect(calls.sla[0]).toBeInstanceOf(Date); // high-risk SLA reset
    expect(calls.notified).toEqual(['psy-1']);
    expect(calls.audit).toContain('case_reassigned');
  });

  it('does not reset the SLA for a non-high-risk case', async () => {
    const { deps, calls } = reassignDeps(caseRecord({ riskLevel: RiskLevel.MODERATE }), psychologist());
    await reassignCase('case-1', 'psy-1', ACTOR, deps);
    expect(calls.sla).toEqual([]);
  });

  it('rejects a target that is not an active psychologist (400)', async () => {
    const { deps } = reassignDeps(caseRecord(), psychologist({ status: 'inactive' }));
    await expect(reassignCase('case-1', 'psy-1', ACTOR, deps)).rejects.toMatchObject({ status: 400 });
  });

  it('refuses to reassign a closed case (409)', async () => {
    const { deps } = reassignDeps(caseRecord({ status: 'CLOSED' }), psychologist());
    await expect(reassignCase('case-1', 'psy-1', ACTOR, deps)).rejects.toMatchObject({ status: 409 });
  });
});

function closeDeps(theCase: CaseRecord | null) {
  const calls = { deleted: [] as string[], status: [] as string[], audit: [] as string[] };
  const deps = {
    cases: {
      async findById() {
        return theCase;
      },
      async updateStatus(_id: string, s: string) {
        calls.status.push(s);
      },
      async updateSlaExpiresAt() {},
    },
    assignments: {
      async deleteByCaseId(id: string) {
        calls.deleted.push(id);
      },
    },
    audit: {
      async append(e: { actionType: string }) {
        calls.audit.push(e.actionType);
      },
    },
  } as unknown as Parameters<typeof coordinatorCloseCase>[3];
  return { deps, calls };
}

describe('coordinatorCloseCase', () => {
  it('closes a stalled case, revokes the assignment and audits the reason', async () => {
    const { deps, calls } = closeDeps(caseRecord({ status: 'PENDING' }));
    await coordinatorCloseCase('case-1', 'estancado', ACTOR, deps);
    expect(calls.deleted).toEqual(['case-1']);
    expect(calls.status).toEqual(['CLOSED']);
    expect(calls.audit).toContain('case_closed_by_coordinator:estancado');
  });

  it('refuses to close an already-closed case (409)', async () => {
    const { deps } = closeDeps(caseRecord({ status: 'CLOSED' }));
    await expect(coordinatorCloseCase('case-1', 'otro', ACTOR, deps)).rejects.toMatchObject({
      status: 409,
    });
  });
});
