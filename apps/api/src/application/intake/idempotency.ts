/**
 * Idempotency for red-branch intake. A person in crisis on an intermittent
 * connection may retry the same request; the same idempotency key must return the
 * original result instead of creating a duplicate case.
 */
export interface IdempotencyStore {
  /** Returns the stored response for a key if present and not expired. */
  get(key: string): Promise<unknown | null>;
  /** Stores a response for a key with a TTL. */
  set(key: string, response: unknown, ttlMs: number): Promise<void>;
}

export async function withIdempotency<T>(
  store: IdempotencyStore,
  key: string | undefined,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) {
    return fn();
  }
  const existing = await store.get(key);
  if (existing !== null) {
    return existing as T;
  }
  const result = await fn();
  await store.set(key, result, ttlMs);
  return result;
}
