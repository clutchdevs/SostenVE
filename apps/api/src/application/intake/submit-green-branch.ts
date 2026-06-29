import { ValidationError } from '../../shared/errors/api-error';
import { generatePseudonymId } from '../../domain/identity/pseudonym';
import { classifyRisk, isHighRisk, weightedUrgencyIndex } from '../../domain/triage';
import { getProvisionalTag } from '../../domain/triage/triage-catalog';
import type { Modality, RequesterType } from '../../domain/case/case';
import { getActiveCrisisLine } from './get-active-crisis-line';
import type { IntakeCaseResult, IntakeDeps } from './types';

export interface GreenBranchInput {
  name?: string;
  contact: string;
  requesterType?: RequesterType;
  zone?: string;
  modality?: Modality;
  age?: number;
  tagCodes: string[];
}

/**
 * Green branch. Resolves clinical tags from the (provisional) catalog server-side
 * — never trusting client-supplied weights — classifies the risk level via the
 * domain interruption rule, and computes the weighted urgency index. If it
 * escalates to high risk (1 red or 3+ orange tags) the response includes crisis
 * lines, honoring the non-negotiable principle.
 */
export async function submitGreenBranch(
  input: GreenBranchInput,
  deps: IntakeDeps,
): Promise<IntakeCaseResult> {
  const now = deps.now?.() ?? new Date();

  const tags = input.tagCodes.map((code) => {
    const tag = getProvisionalTag(code);
    if (!tag) {
      throw new ValidationError(`Unknown clinical tag code: ${code}`);
    }
    return tag;
  });

  const riskLevel = classifyRisk(tags, {
    orangeTagsThresholdForEscalation: deps.config.triage.orange_tags_threshold_for_escalation,
  });
  const urgencyScore = weightedUrgencyIndex(tags);
  const high = isHighRisk(riskLevel);

  const pseudonymId = generatePseudonymId(input.contact, deps.pseudonymSalt);
  const slaMs = deps.config.sla.high_risk_assignment_minutes * 60_000;

  const created = await deps.cases.create({
    pseudonymId,
    branch: 'GREEN',
    riskLevel,
    urgencyScore,
    status: 'PENDING',
    requesterType: input.requesterType,
    zone: input.zone,
    preferredModality: input.modality,
    age: input.age,
    slaExpiresAt: high ? new Date(now.getTime() + slaMs) : undefined,
  });

  await deps.contacts.upsert({ pseudonymId, name: input.name, contact: input.contact });

  return {
    caseId: created.id,
    branch: 'GREEN',
    riskLevel,
    urgencyScore,
    crisisLines: high ? getActiveCrisisLine(deps.config, now) : null,
  };
}
