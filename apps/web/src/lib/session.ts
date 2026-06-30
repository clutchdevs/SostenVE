/** Minimal client-side session storage (access token + role) in localStorage. */
const TOKEN_KEY = 'sostenve.token';
const ROLE_KEY = 'sostenve.role';

export function saveSession(token: string, role: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
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
 * True if there is a stored token that has not expired. A caducated token is
 * cleared as a side effect so the next access falls back to the login screen.
 */
export function isSessionActive(): boolean {
  const token = getToken();
  if (!token) return false;
  const exp = tokenExpiry(token);
  if (exp === null) return true; // unreadable exp → let the server enforce it
  if (Date.now() >= exp) {
    clearSession();
    return false;
  }
  return true;
}
