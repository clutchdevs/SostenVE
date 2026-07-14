import { describe, expect, it } from 'vitest';
import { assignPendingCases } from '../../../src/application/assignment/assign-cases.js';
import { RiskLevel } from '../../../src/domain/triage/index.js';
import type { CaseRecord } from '../../../src/domain/case/case.js';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer.js';
import type { AssignmentDeps } from '../../../src/application/assignment/ports.js';

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
    roles: ['psychologist'],
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

function deps(
  pending: CaseRecord[],
  volunteers: Volunteer[],
  online?: Set<string>,
  claimable?: Set<string>,
  maxCaseload = 6,
) {
  // Default: every listed volunteer is online (presence not under test here).
  const onlineIds = online ?? new Set(volunteers.map((v) => v.id));
  // Default: every case can be claimed (the atomic guard succeeds). Pass a subset
  // to simulate a concurrent trigger having already taken the others.
  const claimableIds = claimable ?? new Set(pending.map((c) => c.id));
  const assignedOrder: string[] = [];
  const assignedTo: Array<{ caseId: string; volunteerId: string }> = [];
  const statusUpdates: string[] = [];
  const claimAttempts: string[] = [];
  const d = {
    cases: {
      // Only PENDING drives the queue; the other statuses feed the caseload count
      // (empty here — these tests start every volunteer idle).
      async listByStatus(status: string) {
        return status === 'PENDING' ? pending : [];
      },
      async claimForAssignment(id: string) {
        claimAttempts.push(id);
        return claimableIds.has(id);
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
      async create({ caseId, volunteerId }: { caseId: string; volunteerId: string }) {
        assignedOrder.push(caseId);
        assignedTo.push({ caseId, volunteerId });
        return { id: `a-${caseId}`, caseId, volunteerId, assignedAt: new Date() };
      },
      async findByCaseIds() {
        return [];
      },
    },
    presence: {
      async filterOnline(ids: readonly string[]) {
        return new Set(ids.filter((id) => onlineIds.has(id)));
      },
    },
    settings: {
      async get() {
        return { maxActiveCaseload: maxCaseload };
      },
    },
    notifier: {
      async notifyAssigned() {},
      async notifyEscalated() {},
    },
  } as unknown as AssignmentDeps;
  return { d, assignedOrder, assignedTo, statusUpdates, claimAttempts };
}

describe('assignPendingCases — urgency ordering (RF-1.5)', () => {
  it('assigns the highest-urgency case first', async () => {
    const earlier = new Date('2026-06-30T10:00:00Z');
    const later = new Date('2026-06-30T11:00:00Z');
    // Low-urgency case arrived first; high-urgency (ideation) arrived later.
    const pending = [makeCase('low', 5, earlier), makeCase('high', 1100, later)];
    const { d, assignedOrder } = deps(pending, [makeVolunteer('v1')]);

    await assignPendingCases(d);

    // One idle volunteer (cap 6) takes both, highest-urgency first.
    expect(assignedOrder).toEqual(['high', 'low']);
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

describe('assignPendingCases — atomic claim guard (no double assignment)', () => {
  it('skips a case already claimed by a concurrent trigger and frees the volunteer', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    // Two pending cases, one volunteer. The higher-urgency case was already taken
    // by a concurrent trigger (not claimable), so the volunteer must fall through
    // to the still-claimable one instead of being consumed by the lost claim.
    const pending = [makeCase('taken', 100, now), makeCase('free', 50, now)];
    const { d, assignedOrder, claimAttempts } = deps(
      pending,
      [makeVolunteer('v1')],
      undefined,
      new Set(['free']), // 'taken' loses the claim
    );

    const assigned = await assignPendingCases(d);

    expect(claimAttempts).toEqual(['taken', 'free']); // tried highest-urgency first
    expect(assigned).toBe(1);
    expect(assignedOrder).toEqual(['free']); // no assignment row for the lost claim
  });

  it('does not create an assignment when the claim is lost', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    const pending = [makeCase('c1', 50, now)];
    const { d, assignedOrder } = deps(
      pending,
      [makeVolunteer('v1')],
      undefined,
      new Set(), // nothing claimable — every claim lost
    );

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(0);
    expect(assignedOrder).toEqual([]);
  });
});

describe('assignPendingCases — load balancing (RF-2.5)', () => {
  it('spreads cases evenly across idle volunteers instead of piling on one', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    const pending = [
      makeCase('c1', 50, now),
      makeCase('c2', 50, now),
      makeCase('c3', 50, now),
      makeCase('c4', 50, now),
    ];
    const { d, assignedTo } = deps(pending, [makeVolunteer('v1'), makeVolunteer('v2')]);

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(4);
    // Each volunteer ends with 2 cases (balanced), not 4-and-0.
    const perVolunteer = new Map<string, number>();
    for (const a of assignedTo) perVolunteer.set(a.volunteerId, (perVolunteer.get(a.volunteerId) ?? 0) + 1);
    expect(perVolunteer.get('v1')).toBe(2);
    expect(perVolunteer.get('v2')).toBe(2);
  });

  it('stops routing to a volunteer once they hit the cap (extra cases stay queued)', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    const pending = [makeCase('c1', 50, now), makeCase('c2', 50, now), makeCase('c3', 50, now)];
    // One volunteer, cap 2 → takes 2, the 3rd stays in the queue.
    const { d, assignedOrder } = deps(pending, [makeVolunteer('v1')], undefined, undefined, 2);

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(2);
    expect(assignedOrder).toHaveLength(2);
  });

  it('lets a high-risk case exceed the cap so a crisis is never left queued', async () => {
    const now = new Date('2026-06-30T10:00:00Z');
    // Cap 0 → nobody has capacity. A normal case stays queued, but the high-risk
    // case bypasses the cap and is still assigned.
    const pending = [
      makeCase('normal', 50, now),
      { ...makeCase('crisis', 1000, now), riskLevel: RiskLevel.HIGH },
    ];
    const { d, assignedOrder } = deps(pending, [makeVolunteer('v1')], undefined, undefined, 0);

    const assigned = await assignPendingCases(d);

    expect(assigned).toBe(1);
    expect(assignedOrder).toEqual(['crisis']); // only the crisis got through
  });
});
