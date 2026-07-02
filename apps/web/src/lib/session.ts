/** Minimal client-side session storage (access token + role) in localStorage. */
import { SESSION_IDLE_TIMEOUT_MINUTES } from './config';

const TOKEN_KEY = 'ppv.token';
const ROLE_KEY = 'ppv.role';
const ACTIVITY_KEY = 'ppv.lastActivity';

const IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MINUTES * 60_000;

export function saveSession(token: string, role: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
  touchActivity();
}

/** Records "now" as the last user activity (resets the idle window, RF-2.7). */
export function touchActivity(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

/** True if the session has been idle longer than the inactivity timeout. */
export function isSessionIdle(now: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  const last = window.localStorage.getItem(ACTIVITY_KEY);
  if (last === null) return false; // no activity recorded yet → not idle
  return now - Number(last) >= IDLE_TIMEOUT_MS;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(ACTIVITY_KEY);
}

/** Landing route for a role after login. */
export function homePathForRole(role: string | null): string {
  if (role === 'admin') return '/admin';
  if (role === 'coordinator') return '/coordinador';
  return '/psicologo';
}

/** Expiry (ms epoch) from a JWT's `exp` claim, or null if it can't be read. */
function tokenExpiry(token: string): number | null {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return null;
  try {
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * True if there is a stored token that has neither expired (absolute, from the
 * JWT `exp`) nor gone idle past the inactivity timeout (RF-2.7). Either way an
 * invalid session is cleared as a side effect so the next access falls back to
 * the login screen.
 */
export function isSessionActive(): boolean {
  const token = getToken();
  if (!token) return false;
  if (isSessionIdle()) {
    clearSession();
    return false;
  }
  const exp = tokenExpiry(token);
  if (exp === null) return true; // unreadable exp → let the server enforce it
  if (Date.now() >= exp) {
    clearSession();
    return false;
  }
  return true;
}
