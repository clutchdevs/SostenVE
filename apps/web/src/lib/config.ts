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
export const SESSION_IDLE_TIMEOUT_MINUTES = 30;

/**
 * Presence heartbeat interval in seconds (RF-2.5.2). Mirrors
 * `presence.heartbeat_interval_seconds`; the PWA pings while online so the
 * backend keeps the volunteer's presence key alive (130 s TTL server-side).
 * Kept well below the TTL so a single missed ping doesn't drop presence, while
 * halving the write volume to the presence store (Upstash cost) vs a 30 s ping.
 */
export const PRESENCE_HEARTBEAT_INTERVAL_SECONDS = 60;

/**
 * Data refresh (polling) cadence in seconds for the PWA panels — coordinator
 * board, case/volunteer lists and case detail — to approximate real time without
 * websockets. Mirrors `ui.data_refresh_seconds`; kept here so no screen hardcodes
 * the interval. Consumers multiply by 1000 for `setInterval`.
 */
export const DATA_REFRESH_INTERVAL_SECONDS = 15;
export const DATA_REFRESH_INTERVAL_MS = DATA_REFRESH_INTERVAL_SECONDS * 1000;

/**
 * Minutes-before-expiry at which a high-risk case is shown as "expiring" (warning)
 * on the coordinator board. Mirrors `sla.warning_threshold_minutes`.
 */
export const SLA_WARNING_THRESHOLD_MINUTES = 5;

export function weeksSince(dateIso: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(dateIso).getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}
