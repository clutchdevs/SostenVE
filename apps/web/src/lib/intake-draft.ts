/**
 * Intake draft persistence (issue #2, offline-first). The requester's in-progress
 * intake is saved to localStorage so it survives a reload or an accidental tab
 * close on a flaky connection, and is cleared once the submission is accepted or
 * safely queued for retry. Pure localStorage — no network, so it never blocks the
 * crisis-lines fail-safe.
 */
export const INTAKE_DRAFT_KEYS = {
  verde: 'ppv.intakeDraft.verde',
  roja: 'ppv.intakeDraft.roja',
} as const;

export function saveDraft<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode): degrade silently.
  }
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}
