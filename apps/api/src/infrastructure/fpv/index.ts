import type { AppConfig } from '../../config';
import type {
  FpvVerificationInput,
  FpvVerificationResult,
  FpvVerifier,
} from '../../application/volunteer/ports';
import { CircuitBreaker } from '../../shared/circuit-breaker';
import { DummyFpvVerifier } from './dummy-fpv-verifier';
import { HttpFpvVerifier } from './http-fpv-verifier';

/**
 * Wraps the selected FPV verifier in a circuit breaker so repeated failures of
 * the external service fail fast; the registration use case then falls back to
 * `pending_approval` instead of blocking sign-ups.
 */
class CircuitBreakerFpvVerifier implements FpvVerifier {
  constructor(
    private readonly inner: FpvVerifier,
    private readonly breaker: CircuitBreaker,
  ) {}

  verify(input: FpvVerificationInput): Promise<FpvVerificationResult> {
    return this.breaker.execute(() => this.inner.verify(input));
  }
}

export function createFpvVerifier(config: AppConfig): FpvVerifier {
  const inner =
    config.fpv.verifier === 'http'
      ? new HttpFpvVerifier({
          baseUrl: config.fpv.base_url,
          // Secret: kept out of config (see .env.example). Missing token makes
          // verify() throw NotConfiguredError → registration falls back to
          // pending_approval instead of silently approving everyone.
          token: process.env.FPV_API_TOKEN ?? '',
          timeoutMs: config.fpv.request_timeout_seconds * 1000,
        })
      : new DummyFpvVerifier();
  const breaker = new CircuitBreaker({
    failureThreshold: config.fpv.circuit_breaker.failure_threshold,
    cooldownMs: config.fpv.circuit_breaker.cooldown_seconds * 1000,
  });
  return new CircuitBreakerFpvVerifier(inner, breaker);
}
