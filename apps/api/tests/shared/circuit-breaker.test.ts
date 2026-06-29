import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../../src/shared/circuit-breaker';

describe('CircuitBreaker', () => {
  it('passes results through and resets on success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok');
  });

  it('opens after the failure threshold and fails fast without calling the dependency', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    const failing = async () => {
      throw new Error('boom');
    };
    await expect(breaker.execute(failing)).rejects.toThrow('boom');
    await expect(breaker.execute(failing)).rejects.toThrow('boom');

    const spy = vi.fn(async () => 'should not run');
    await expect(breaker.execute(spy)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('allows a trial call after the cooldown elapses', async () => {
    let clock = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 1000,
      now: () => clock,
    });
    await expect(
      breaker.execute(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Still open before cooldown.
    await expect(breaker.execute(async () => 'ok')).rejects.toBeInstanceOf(CircuitOpenError);

    clock = 1000; // cooldown elapsed
    await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok');
  });
});
