import type {
  FpvVerificationInput,
  FpvVerificationResult,
  FpvVerifier,
} from '../../application/volunteer/ports';

/**
 * Dummy FPV verifier — ALWAYS approves.
 *
 * Stand-in used until the Federation provides the real FPV registry API contract
 * (endpoint, auth, request/response). It simulates a successful verification so
 * the registration flow can be built and exercised end to end now. Swap it for
 * {@link HttpFpvVerifier} via config (`fpv.verifier: http`) once the contract is
 * known — no change to the use cases is required (see ADR-0013).
 */
export class DummyFpvVerifier implements FpvVerifier {
  async verify(_input: FpvVerificationInput): Promise<FpvVerificationResult> {
    return { valid: true, reason: 'dummy-verifier-always-approves' };
  }
}
