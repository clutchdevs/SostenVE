import { afterEach, describe, expect, it, vi } from 'vitest';
import { escalateOverdueCases } from '../../../src/application/assignment/escalate-sla';
import { logger } from '../../../src/shared/logger';
import { RiskLevel } from '../../../src/domain/triage';
import type { CaseRecord } from '../../../src/domain/case/case';
import type { Volunteer } from '../../../src/domain/volunteer/volunteer';
import type { AssignmentDeps } from '../../../src/application/assignment/ports';

function highRiskCase(id: string): CaseRecord {
  return {
    id,
    pseudonymId: `p-${id}`,
    branch: 'RED',
    riskLevel: RiskLevel.HIGH,
    urgencyScore: 100,
    status: 'ASSIGNED',
    createdAt: new Date(),
  };
}

function coordinator(): Volunteer {
  return {
    id: 'c1',
    fullName: 'Coord',
    professionalId: 'FPV-C',
    role: 'coordinator',
    tokenVersion: 1,
    status: 'active',
    createdAt: new Date(),
  };
}

function deps(overdue: CaseRecord[], activeStaff: Volunteer[]): AssignmentDeps {
  return {
    cases: {
      async listOverdueHighRiskAssigned() {
        return overdue;
      },
      async updateStatus() {},
    },
    assignments: { async deleteByCaseId() {} },
    volunteers: {
      async listByStatus() {
        return activeStaff;
      },
    },
    notifier: { async notifyEscalated() {}, async notifyAssigned() {} },
  } as unknown as AssignmentDeps;
}

afterEach(() => vi.restoreAllMocks());

describe('escalateOverdueCases — no-coordinator alert (fase 06)', () => {
  it('raises a critical alert when a high-risk case escalates with no active coordinator', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const count = await escalateOverdueCases(deps([highRiskCase('x1')], []), new Date());

    expect(count).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, context] = errorSpy.mock.calls[0]!;
    expect(message).toContain('high_risk_escalated_no_coordinator');
    expect(context).toMatchObject({ alert: 'high_risk_escalated_no_coordinator', caseId: 'x1' });
  });

  it('does NOT alert when an active coordinator is available', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    await escalateOverdueCases(deps([highRiskCase('x1')], [coordinator()]), new Date());
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does nothing (and does not query staff) when there is nothing overdue', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const count = await escalateOverdueCases(deps([], []), new Date());
    expect(count).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
