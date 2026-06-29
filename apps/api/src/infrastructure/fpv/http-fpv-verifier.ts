import type {
  FpvVerificationInput,
  FpvVerificationResult,
  FpvVerifier,
} from '../../application/volunteer/ports';

export class NotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

/**
 * Real FPV registry verifier over HTTP — SKELETON.
 *
 * <TODO — Human-in-the-Loop>: the Federation has not provided the API contract
 * yet (base URL, authentication scheme, request/response shape). When it does:
 *  1. Read the endpoint/credentials from environment variables.
 *  2. Implement `verify` to call the FPV API and map its response to
 *     {@link FpvVerificationResult}.
 *  3. Set `fpv.verifier: http` in config to activate it.
 *
 * Until then it throws so a misconfiguration fails loudly (and the registration
 * flow's circuit breaker falls back to `pending_approval`).
 */
export class HttpFpvVerifier implements FpvVerifier {
  async verify(_input: FpvVerificationInput): Promise<FpvVerificationResult> {
    throw new NotConfiguredError(
      'HttpFpvVerifier is not configured: the FPV API contract is still pending',
    );
  }
}
