/**
 * RF-4.2.9 — Acute Psychotic Crisis safety rule.
 *
 * When an acute psychotic crisis is present, the referral type is forced to
 * URGENT and locked (not editable), regardless of what was requested. This is
 * life-safety logic, in the same spirit as the red-branch interruption rule.
 * Pure and deterministic.
 */
export const ReferralType = Object.freeze({
  URGENT: 'URGENT',
  ROUTINE: 'ROUTINE',
} as const);

export type ReferralType = (typeof ReferralType)[keyof typeof ReferralType];

export interface ReferralDecision {
  readonly type: ReferralType;
  /** When true, the referral type must not be editable downstream. */
  readonly locked: boolean;
}

export interface ResolveReferralInput {
  hasAcutePsychoticCrisis: boolean;
  /** Referral type requested by the clinician when no override applies. */
  requested: ReferralType;
}

export function resolveReferral(input: ResolveReferralInput): ReferralDecision {
  if (input.hasAcutePsychoticCrisis) {
    return Object.freeze({ type: ReferralType.URGENT, locked: true });
  }
  return Object.freeze({ type: input.requested, locked: false });
}
