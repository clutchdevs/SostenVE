import { z } from 'zod';

/**
 * Zod schema for the non-secret application configuration loaded from
 * `config/app.config.yml`. Secrets are NOT part of this schema; they come from
 * environment variables (see .env.example).
 */

const crisisLineRoutingSchema = z.object({
  name: z.string().min(1),
  // Real clock hours 0–24; an overnight window uses end_hour <= start_hour (e.g. 20 -> 2).
  start_hour: z.number().int().min(0).max(24),
  end_hour: z.number().int().min(0).max(24),
  phone: z.string().min(1),
});

const backupLineSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
});

export const appConfigSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    locale: z.string().min(1),
  }),
  triage: z.object({
    orange_tags_threshold_for_escalation: z.number().int().positive(),
    likert_critical_option: z.number().int(),
  }),
  sla: z.object({
    high_risk_assignment_minutes: z.number().int().positive(),
    // Minutes-before-expiry at which a high-risk case is flagged "expiring" on the
    // coordinator board. Mirrored client-side in apps/web/src/lib/config.ts.
    warning_threshold_minutes: z.number().int().positive(),
  }),
  // Intake tuning. `idempotency_ttl_hours`: window during which a red-branch resubmit
  // with the same Idempotency-Key resolves to the same case (offline-first, ADR-0016).
  intake: z.object({
    idempotency_ttl_hours: z.number().int().positive(),
  }),
  crisis_lines: z.object({
    routing: z.array(crisisLineRoutingSchema).min(1),
    backup_lines: z.array(backupLineSchema),
  }),
  clinical_records: z.object({
    tept_diagnosis_block_days: z.number().int().nonnegative(),
    event_date: z.string().min(1),
  }),
  consent: z.object({
    psychologist: z.object({
      version: z.string().min(1),
      updated_at: z.string().min(1),
      text: z.string().min(1),
    }),
    // Informational consent/privacy notice shown on every requester screen
    // (issue #1). Non-blocking by design so it never adds friction to the
    // high-risk path; text is provisional pending FPV validation.
    // Confidentiality + accountability notice shown in the closed-case reports
    // section (issue #169, ADR-0017): states in-place that the Federation owns this
    // data, decides who accesses it and takes custody of anything downloaded.
    reports: z.object({
      version: z.string().min(1),
      updated_at: z.string().min(1),
      text: z.string().min(1),
    }),
    requester: z.object({
      version: z.string().min(1),
      updated_at: z.string().min(1),
      text: z.string().min(1),
    }),
  }),
  // Asynchronous Psychological First Aid (PAP) self-help guides for the
  // requester (RF Módulo 1). Versioned like the consent text; content is
  // provisional pending FPV validation.
  pap: z.object({
    version: z.string().min(1),
    updated_at: z.string().min(1),
    guides: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          summary: z.string().min(1),
          steps: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(1),
  }),
  fpv: z.object({
    verifier: z.enum(['dummy', 'http']),
    // Base URL of the FPV validation API (issue #6). Only used by the `http`
    // verifier; the `X-API-TOKEN` credential is a secret read from the
    // FPV_API_TOKEN env var (not stored here).
    base_url: z.string().min(1),
    // Abort the FPV request after this many seconds so a slow registry never
    // hangs a registration; on timeout the flow falls back to pending_approval.
    request_timeout_seconds: z.number().int().positive(),
    circuit_breaker: z.object({
      failure_threshold: z.number().int().positive(),
      cooldown_seconds: z.number().int().positive(),
    }),
  }),
  email: z.object({
    provider: z.enum(['log', 'smtp']),
    from: z.string().min(1),
    // Public base URL the welcome email links to for sign-in.
    login_url: z.string().min(1),
    // Public URL the coordinator invitation email links to (RF-2.6); the raw
    // token is appended as a `?token=` query param.
    coordinator_invite_url: z.string().min(1),
    // Public URL the password reset email links to (RF-2.2.4); the raw token is
    // appended as a `?token=` query param.
    password_reset_url: z.string().min(1),
    smtp: z.object({
      // host/username may be blank in the file: in production they come from the
      // environment (SMTP_HOST / SMTP_USERNAME), which overrides the config value.
      host: z.string(),
      port: z.number().int().positive(),
      username: z.string(),
    }),
  }),
  // Real-time volunteer presence (RF-2.5). `provider`: memory (dev/tests, single
  // process) | upstash (production Redis over REST). TTL/interval mirror the PRD
  // (65 s expiry refreshed by a 30 s heartbeat).
  presence: z.object({
    provider: z.enum(['memory', 'upstash']),
    heartbeat_ttl_seconds: z.number().int().positive(),
    heartbeat_interval_seconds: z.number().int().positive(),
  }),
  // UX cadence for the PWA panels (RF-2.5): how often the coordinator board,
  // case/volunteer lists and case detail re-poll the API. Mirrored client-side in
  // apps/web/src/lib/config.ts so the interval isn't hardcoded per screen.
  ui: z.object({
    data_refresh_seconds: z.number().int().positive(),
  }),
  rbac: z.object({
    roles: z.array(z.string().min(1)).min(1),
  }),
  security: z.object({
    cors: z.object({
      development_origins: z.array(z.string().min(1)),
      production_origins: z.array(z.string().min(1)),
    }),
    rate_limit: z.object({
      intake_requests_per_minute: z.number().int().positive(),
      login_attempts_before_lockout: z.number().int().positive(),
      login_lockout_minutes: z.number().int().positive(),
    }),
    jwt: z.object({
      access_token_ttl_minutes: z.number().int().positive(),
      refresh_token_ttl_days: z.number().int().positive(),
    }),
    session: z.object({
      // Idle (inactivity) timeout (RF-2.7): a session with no activity for this
      // many minutes is expired client-side; the short access-token TTL bounds it
      // server-side regardless.
      idle_timeout_minutes: z.number().int().positive(),
      // Invitation tokens (RF-2.6) are valid for this many days.
      invitation_ttl_days: z.number().int().positive(),
      // Password reset tokens (RF-2.2.4) are valid for this many minutes; kept
      // short since the link grants a password change.
      password_reset_ttl_minutes: z.number().int().positive(),
    }),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
