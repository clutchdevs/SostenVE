/**
 * Client-side constants mirrored from the backend config. Kept in sync with
 * config/app.config.yml. Used for UX-level validation (the backend remains the
 * source of truth and re-validates).
 */
export const EVENT_DATE = '2026-06-24';
export const TEPT_BLOCK_DAYS = 30;

/**
 * Idle (inactivity) session timeout in minutes (RF-2.7). Mirrors
 * `security.session.idle_timeout_minutes`; the backend bounds sessions
 * server-side via the short access-token TTL regardless.
 */
export const SESSION_IDLE_TIMEOUT_MINUTES = 15;

export function weeksSince(dateIso: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(dateIso).getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}
