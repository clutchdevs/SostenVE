import { apiFetch, ApiError } from './api-client';

/**
 * Intake retry outbox (issue #2, offline-first). When an intake submission can't
 * reach the backend (no/degraded connection), it is queued in localStorage and
 * retried later — so a request captured on a flaky connection is never lost. This
 * is deliberately independent of the crisis-lines fail-safe: queuing a submission
 * never affects the numbers a high-risk person sees.
 */
export interface PendingSubmission {
  id: string;
  endpoint: string;
  payload: unknown;
  createdAt: number;
  attempts: number;
}

const KEY = 'ppv.intakeOutbox';

function read(): PendingSubmission[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingSubmission[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable: nothing more we can do without losing the flow.
  }
}

function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Queues a submission for later delivery and returns it. */
export function enqueueSubmission(endpoint: string, payload: unknown): PendingSubmission {
  const item: PendingSubmission = {
    id: newId(),
    endpoint,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  write([...read(), item]);
  return item;
}

export function pendingCount(): number {
  return read().length;
}

/**
 * Attempts to deliver every queued submission. A successful send or a permanent
 * client error (4xx — retrying won't fix malformed/rejected data) drops the item;
 * a network failure or server error (5xx) keeps it, bumping its attempt count.
 * Re-reads storage before writing so a submission queued during the flush is not
 * lost. Returns how many remain queued afterwards.
 */
export async function flushOutbox(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;

  const dropped = new Set<string>();
  const kept = new Map<string, PendingSubmission>();

  for (const item of items) {
    try {
      await apiFetch(item.endpoint, { method: 'POST', auth: false, body: item.payload });
      dropped.add(item.id);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        dropped.add(item.id); // permanent: don't retry forever
      } else {
        kept.set(item.id, { ...item, attempts: item.attempts + 1 });
      }
    }
  }

  // Merge with the current queue so anything enqueued mid-flush survives.
  const merged = read()
    .filter((i) => !dropped.has(i.id))
    .map((i) => kept.get(i.id) ?? i);
  write(merged);
  return merged.length;
}
