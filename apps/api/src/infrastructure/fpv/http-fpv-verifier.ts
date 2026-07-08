import type {
  FpvVerificationInput,
  FpvVerificationResult,
  FpvVerifier,
} from '../../application/volunteer/ports.js';

export class NotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

export interface HttpFpvVerifierOptions {
  /** Base URL of the FPV API, e.g. `https://api.sistema.fpv.org.ve`. */
  baseUrl: string;
  /** `X-API-TOKEN` credential (secret; from the FPV_API_TOKEN env var). */
  token: string;
  /** Abort the request after this many milliseconds. */
  timeoutMs: number;
}

/** Common envelope wrapping every FPV API response (issue #6). */
interface FpvEnvelope<TData> {
  /**
   * Application-level status in the envelope (200/404/401…). The API mirrors it
   * here, so we honour it when the transport returns HTTP 200 for everything.
   */
  status?: number;
  data?: TData;
}

interface ValidateData {
  valid?: boolean;
  /** Licence status in the registry: `active` when in good standing. */
  status?: string;
}

/** Raw `data` object of `GET /public/psicologo/{national_id}` (issue #6). */
interface ProfileData {
  id: number;
  fpv_number: string;
  colleges: string[];
  specializations: string[];
  nationality: string;
  national_id: string;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  degree_title: string;
  university: string;
  created_at: string;
  updated_at: string;
}

/** Mapped (camelCase) psychologist profile from the FPV padrón. */
export interface FpvPsychologistProfile {
  id: number;
  fpvNumber: string;
  colleges: string[];
  specializations: string[];
  nationality: string;
  nationalId: string;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  degreeTitle: string;
  university: string;
  createdAt: string;
  updatedAt: string;
}

function mapProfile(data: ProfileData): FpvPsychologistProfile {
  return {
    id: data.id,
    fpvNumber: data.fpv_number,
    colleges: data.colleges ?? [],
    specializations: data.specializations ?? [],
    nationality: data.nationality,
    nationalId: data.national_id,
    fullName: data.full_name,
    firstName: data.first_name,
    middleName: data.middle_name ?? null,
    lastName: data.last_name,
    secondLastName: data.second_last_name ?? null,
    degreeTitle: data.degree_title,
    university: data.university,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Real FPV registry client over HTTP (issue #6). Wraps two padrón endpoints,
 * both authenticated with the `X-API-TOKEN` header:
 *  - `verify` → `GET /public/validate?national_id=…&fpv=…`
 *  - `getProfile` → `GET /public/psicologo/{national_id}`
 *
 * The effective status is taken from the HTTP status, or — when the API returns
 * HTTP 200 for everything — from the envelope's `status` field. In both methods
 * 401 means a misconfigured token (throws {@link NotConfiguredError}); any other
 * non-2xx / network error / timeout throws so the caller's circuit breaker trips
 * and registration falls back to `pending_approval` (ADR-0013).
 *
 * The token is never logged (the shared logger redacts it anyway). Activate via
 * config (`fpv.verifier: http`) plus the FPV_API_TOKEN env var.
 */
export class HttpFpvVerifier implements FpvVerifier {
  constructor(private readonly options: HttpFpvVerifierOptions) {}

  /**
   * Point-in-time verification for the registration flow:
   *  - `data.valid === true` AND `data.status === 'active'` → valid.
   *    A match whose licence is not active (suspended/inactive) does NOT
   *    auto-approve; it drops to manual review (safety).
   *  - 404 (or `data.valid !== true`) → not found (invalid).
   */
  async verify(input: FpvVerificationInput): Promise<FpvVerificationResult> {
    const url = new URL('/api/v1/public/validate', this.options.baseUrl);
    url.searchParams.set('national_id', input.nationalId);
    url.searchParams.set('fpv', input.professionalId);

    const { status, body } = await this.request<ValidateData>(url);

    if (status === 404) {
      return { valid: false, reason: 'fpv_not_found' };
    }
    if (status < 200 || status >= 300) {
      throw new Error(`FPV API returned an unexpected status: ${status}`);
    }

    const data = body.data;
    if (data?.valid !== true) {
      return { valid: false, reason: 'fpv_not_found' };
    }
    if (data.status !== 'active') {
      // Found in the padrón but the licence is not active: route to manual review.
      return { valid: false, reason: `fpv_status_${data.status ?? 'unknown'}` };
    }
    return { valid: true };
  }

  /**
   * Fetches the full padrón record for a cédula, mapped to camelCase.
   * Returns `null` when the person is not in the padrón (404); throws on a
   * misconfigured token (401) or any other transport/registry error.
   */
  async getProfile(nationalId: string): Promise<FpvPsychologistProfile | null> {
    const url = new URL(
      `/api/v1/public/psicologo/${encodeURIComponent(nationalId)}`,
      this.options.baseUrl,
    );

    const { status, body } = await this.request<ProfileData>(url);

    if (status === 404) {
      return null;
    }
    if (status < 200 || status >= 300) {
      throw new Error(`FPV API returned an unexpected status: ${status}`);
    }
    if (!body.data) {
      return null;
    }
    return mapProfile(body.data);
  }

  /**
   * Shared HTTP plumbing: authenticated GET with a timeout, defensive JSON parse
   * and effective-status resolution. Throws {@link NotConfiguredError} when the
   * token is missing or the API answers 401.
   */
  private async request<TData>(
    url: URL,
  ): Promise<{ status: number; body: FpvEnvelope<TData> }> {
    if (!this.options.token) {
      throw new NotConfiguredError(
        'HttpFpvVerifier is not configured: FPV_API_TOKEN is not set',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-TOKEN': this.options.token,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Parse defensively: a non-JSON error page must not crash the mapping.
    let body: FpvEnvelope<TData> = {};
    try {
      body = (await response.json()) as FpvEnvelope<TData>;
    } catch {
      body = {};
    }

    // Trust the HTTP status when it already signals an error; otherwise (the API
    // returns HTTP 200 for everything) fall back to the envelope's `status`.
    const status =
      response.status !== 200
        ? response.status
        : typeof body.status === 'number'
          ? body.status
          : 200;

    if (status === 401) {
      throw new NotConfiguredError('FPV API rejected the X-API-TOKEN (401)');
    }
    return { status, body };
  }
}
