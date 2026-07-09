import { UnauthorizedError } from '../../shared/errors/api-error.js';
import { verifyPassword } from '../../shared/security/password.js';
import { signToken } from '../../shared/security/jwt.js';
import type { AppConfig } from '../../config/index.js';
import type { VolunteerRepository, VolunteerRole } from '../../domain/volunteer/volunteer.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginDeps {
  volunteers: VolunteerRepository;
  config: AppConfig;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  role: VolunteerRole;
}

/**
 * Authenticates a volunteer by email + password. Requires an `active` status, so
 * pending or deactivated accounts cannot log in. Issues short-lived access and
 * longer-lived refresh tokens carrying the role and current token version.
 */
export async function loginVolunteer(input: LoginInput, deps: LoginDeps): Promise<LoginResult> {
  console.error('[LOGIN-DBG] findByEmail start');
  const volunteer = await deps.volunteers.findByEmail(input.email);
  console.error('[LOGIN-DBG] findByEmail done, found=', !!volunteer);
  // Use a generic error regardless of which check fails (no account enumeration).
  const invalid = new UnauthorizedError('Invalid credentials');
  if (!volunteer) {
    throw invalid;
  }

  console.error('[LOGIN-DBG] getPasswordHash start');
  const hash = await deps.volunteers.getPasswordHash(volunteer.id);
  console.error('[LOGIN-DBG] getPasswordHash done, hasHash=', !!hash);
  console.error('[LOGIN-DBG] verifyPassword start');
  const passwordOk = !!hash && (await verifyPassword(input.password, hash));
  console.error('[LOGIN-DBG] verifyPassword done, ok=', passwordOk);
  if (!passwordOk) {
    throw invalid;
  }
  if (volunteer.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  // Destroy any prior session in-place (RF-2.7): bump token_version so previously
  // issued tokens (carrying the old version) are rejected, and mint this session
  // with the new version.
  console.error('[LOGIN-DBG] bumpTokenVersion start');
  const tokenVersion = await deps.volunteers.bumpTokenVersion(volunteer.id);
  console.error('[LOGIN-DBG] bumpTokenVersion done, v=', tokenVersion);
  const claims = { sub: volunteer.id, role: volunteer.role, tokenVersion };
  console.error('[LOGIN-DBG] signToken start');
  const accessToken = await signToken(claims, {
    ttlSeconds: deps.config.security.jwt.access_token_ttl_minutes * 60,
    type: 'access',
  });
  const refreshToken = await signToken(claims, {
    ttlSeconds: deps.config.security.jwt.refresh_token_ttl_days * 86_400,
    type: 'refresh',
  });
  console.error('[LOGIN-DBG] signToken done');

  return { accessToken, refreshToken, role: volunteer.role };
}
