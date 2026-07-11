import { getToken } from './session';

/** Base URL of the API; configurable per environment. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  /** Attach the stored bearer token (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * Which role the current portal is acting as (#133 multi-role), derived from the
 * route. Sent as `X-Active-Role` so shared endpoints (e.g. GET /cases) return the
 * right view for a user who holds more than one role. Ignored server-side unless
 * the account actually has that role.
 */
function activeRoleFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const p = window.location.pathname;
  if (p.startsWith('/coordinador')) return 'coordinator';
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/psicologo')) return 'psychologist';
  return null;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const activeRole = activeRoleFromPath();
    if (activeRole) headers['X-Active-Role'] = activeRole;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
