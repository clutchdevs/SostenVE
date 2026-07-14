import { generatePseudonymId } from '../../domain/identity/pseudonym.js';
import { RED_BRANCH_URGENCY, RiskLevel } from '../../domain/triage/index.js';
import { toInternationalVePhone } from '../../shared/phone.js';
import { getActiveCrisisLine } from './get-active-crisis-line.js';
import type { IntakeCaseResult, IntakeDeps } from './types.js';

export type RedBranchSubChannel = 'llamar' | 'recibir-llamada' | 'whatsapp-silencioso';

export interface RedBranchInput {
  subChannel: RedBranchSubChannel;
  name?: string;
  contact?: string;
  age?: number;
}

/**
 * Red branch (high risk). Always returns the active crisis line so the person
 * sees it immediately (non-negotiable principle). For 'recibir-llamada' and
 * 'whatsapp-silencioso' it also creates a high-risk case with minimal PII; for
 * 'llamar' the person calls directly and no case is created.
 */
export async function submitRedBranch(
  input: RedBranchInput,
  deps: IntakeDeps,
): Promise<IntakeCaseResult> {
  const now = deps.now?.() ?? new Date();
  const crisisLines = getActiveCrisisLine(deps.config, now);

  if (input.subChannel === 'llamar' || !input.contact) {
    return {
      caseId: null,
      branch: 'RED',
      riskLevel: RiskLevel.HIGH,
      urgencyScore: RED_BRANCH_URGENCY,
      crisisLines,
    };
  }

  // International format (issue #129) so the assigned psychologist's WhatsApp
  // link (wa.me) resolves correctly regardless of how the requester typed it.
  const contact = toInternationalVePhone(input.contact);
  const pseudonymId = generatePseudonymId(contact, deps.pseudonymSalt);
  const slaMs = deps.config.sla.high_risk_assignment_minutes * 60_000;

  const created = await deps.cases.create({
    pseudonymId,
    branch: 'RED',
    riskLevel: RiskLevel.HIGH,
    urgencyScore: RED_BRANCH_URGENCY,
    status: 'PENDING',
    slaExpiresAt: new Date(now.getTime() + slaMs),
  });

  await deps.contacts.upsert({ pseudonymId, name: input.name, contact });

  return {
    caseId: created.id,
    branch: 'RED',
    riskLevel: RiskLevel.HIGH,
    urgencyScore: created.urgencyScore,
    crisisLines,
  };
}
