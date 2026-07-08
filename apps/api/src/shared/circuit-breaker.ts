/**
 * Minimal circuit breaker. Wraps a flaky external call (e.g. the FPV verifier):
 * after `failureThreshold` consecutive failures it "opens" and, for
 * `cooldownMs`, fails fast with {@link CircuitOpenError} instead of calling the
 * dependency. After the cooldown it allows one trial call to test recovery.
 */
export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  now?: () => number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new CircuitOpenError();
    }
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.openedAt === null) {
      return false;
    }
    if (this.now() - this.openedAt >= this.options.cooldownMs) {
      // Cooldown elapsed: allow a trial call (half-open).
      this.openedAt = null;
      this.failures = 0;
      return false;
    }
    return true;
  }

  private recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.openedAt = this.now();
    }
  }

  private reset(): void {
    this.failures = 0;
    this.openedAt = null;
  }
}
