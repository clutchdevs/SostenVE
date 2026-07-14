import { ValidationError } from '../../shared/errors/api-error.js';
import { generatePseudonymId } from '../../domain/identity/pseudonym.js';
import { classifyRisk, computeUrgencyIndex, isHighRisk } from '../../domain/triage/index.js';
import { getCatalogTag, requiresChildSpecialty } from '../../domain/triage/triage-catalog.js';
import { toInternationalVePhone } from '../../shared/phone.js';
import type { ContactMethod, Modality, RequesterType } from '../../domain/case/case.js';
import { getActiveCrisisLine } from './get-active-crisis-line.js';
import type { IntakeCaseResult, IntakeDeps } from './types.js';

export interface GreenBranchInput {
  name?: string;
  contact: string;
  requesterType?: RequesterType;
  zone?: string;
  /** Requester's state for the regional cluster (RF-3.1). */
  region?: string;
  modality?: Modality;
  /** Preferred contact channel (RF-1.3 screen 2). */
  contactMethod?: ContactMethod;
  age?: number;
  tagCodes: string[];
  /** Recent habit changes reported on screen 5 (feeds the urgency index, RF-1.5). */
  habitChanges?: string[];
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
    const tag = getCatalogTag(code);
    if (!tag) {
      throw new ValidationError(`Unknown clinical tag code: ${code}`);
    }
    return tag;
  });

  const riskLevel = classifyRisk(tags, {
    orangeTagsThresholdForEscalation: deps.config.triage.orange_tags_threshold_for_escalation,
  });
  const urgencyScore = computeUrgencyIndex({
    tags,
    habitChangeCount: input.habitChanges?.length ?? 0,
  });
  const high = isHighRisk(riskLevel);

  // International format (issue #129) so the assigned psychologist's WhatsApp
  // link (wa.me) resolves correctly regardless of how the requester typed it.
  const contact = toInternationalVePhone(input.contact);
  const pseudonymId = generatePseudonymId(contact, deps.pseudonymSalt);
  const slaMs = deps.config.sla.high_risk_assignment_minutes * 60_000;

  const created = await deps.cases.create({
    pseudonymId,
    branch: 'GREEN',
    riskLevel,
    urgencyScore,
    status: 'PENDING',
    requesterType: input.requesterType,
    zone: input.zone,
    region: input.region,
    preferredModality: input.modality,
    preferredContactMethod: input.contactMethod,
    age: input.age,
    habitChanges: input.habitChanges,
    // Route to a child specialist if any "Infancia" tag is present (RF-1.3).
    requiresChildSpecialty: requiresChildSpecialty(input.tagCodes),
    slaExpiresAt: high ? new Date(now.getTime() + slaMs) : undefined,
  });

  await deps.contacts.upsert({ pseudonymId, name: input.name, contact });

  return {
    caseId: created.id,
    branch: 'GREEN',
    riskLevel,
    urgencyScore,
    crisisLines: high ? getActiveCrisisLine(deps.config, now) : null,
  };
}
