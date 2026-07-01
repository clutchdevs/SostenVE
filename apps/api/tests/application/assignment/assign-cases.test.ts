import { describe, expect, it } from 'vitest';
import { assignPendingCases } from '../../../src/application/assignment/assign-cases';
import { RiskLevel } from '../../../src/domain/triage';
import type { CaseRecord } from '../../../src/domain/case/case';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer';
import type { AssignmentDeps } from '../../../src/application/assignment/ports';

function makeCase(id: string, urgencyScore: number, createdAt: Date): CaseRecord {
  return {
    id,
    pseudonymId: `pseudo-${id}`,
    branch: 'GREEN',
    riskLevel: RiskLevel.MODERATE,
    urgencyScore,
    status: 'PENDING',
    createdAt,
  };
}

function makeVolunteer(id: string): Volunteer {
  return {
    id,
    fullName: `Psy ${id}`,
    professionalId: `FPV-${id}`,
    role: 'psychologist',
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

function deps(pending: CaseRecord[], volunteers: Volunteer[], online?: Set<string>) {
  // Default: every listed volunteer is online (presence not under test here).
  const onlineIds = online ?? new Set(volunteers.map((v) => v.id));
  const assignedOrder: string[] = [];
  const statusUpdates: string[] = [];
  const d = {
    cases: {
      async listByStatus() {
        return pending;
      },
      async updateStatus(id: string) {
        statusUpdates.push(id);
      },
    },
    volunteers: {
      async listByStatus() {
        return volunteers;
      },
    },
    assignments: {
      async create({ caseId }: { caseId: string }) {
        assignedOrder.push(caseId);
        return { id: `a-${caseId}`, caseId, volunteerId: 'v', assignedAt: new Date() };
      },
    },
    presence: {
      async filterOnline(ids: readonly string[]) {
        return new Set(ids.filter((id) => onlineIds.has(id)));
      },
    },
    notifier: {
      async notifyAssigned() {},
      async notifyEscalated() {},
    },
  } as unknown as AssignmentDeps;
  return { d, assignedOrder, statusUpdates };
}

describe('assignPendingCases — urgency ordering (RF-1.5)', () => {
  it('assigns the highest-urgency case first', async () => {
    const earlier = new Date('2026-06-30T10:00:00Z');
    const later = new Date('2026-06-30T11:00:00Z');
    // Low-urgency case arrived first; high-urgency (ideation) arrived later.
    const pending = [makeCase('low', 5, earlier), makeCase('high', 1100, later)];
    const { d, assignedOrder } = deps(pending, [makeVolunteer('v1')]);

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(1); // only one volunteer available
    expect(assignedOrder[0]).toBe('high'); // urgency wins over arrival order
  });

  it('breaks ties by arrival (FIFO) when urgency is equal', async () => {
    const earlier = new Date('2026-06-30T10:00:00Z');
    const later = new Date('2026-06-30T11:00:00Z');
    const pending = [makeCase('newer', 50, later), makeCase('older', 50, earlier)];
    const { d, assignedOrder } = deps(pending, [makeVolunteer('v1'), makeVolunteer('v2')]);

    await assignPendingCases(d);

    expect(assignedOrder).toEqual(['older', 'newer']);
  });
});

describe('assignPendingCases — presence gate (RF-2.5 / RF-3.1)', () => {
  it('only assigns to online volunteers', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    const pending = [makeCase('c1', 50, now)];
    // v1 is active but offline; v2 is active and online.
    const { d, assignedOrder } = deps(
      pending,
      [makeVolunteer('v1'), makeVolunteer('v2')],
      new Set(['v2']),
    );

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(1);
    expect(assignedOrder).toEqual(['c1']);
  });

  it('leaves cases queued when no volunteer is online', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    const pending = [makeCase('c1', 50, now)];
    const { d, assignedOrder, statusUpdates } = deps(
      pending,
      [makeVolunteer('v1')],
      new Set(), // nobody online
    );

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(0);
    expect(assignedOrder).toEqual([]);
    expect(statusUpdates).toEqual([]); // stays PENDING for the SLA sweep
  });
});
