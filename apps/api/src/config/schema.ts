import { z } from 'zod';

/**
 * Zod schema for the non-secret application configuration loaded from
 * `config/app.config.yml`. Secrets are NOT part of this schema; they come from
 * environment variables (see .env.example).
 */

const crisisLineRoutingSchema = z.object({
  name: z.string().min(1),
  start_hour: z.number().int().min(0),
  end_hour: z.number().int().min(0),
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
    cron_check_interval_minutes: z.number().int().positive(),
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
    smtp: z.object({
      host: z.string().min(1),
      port: z.number().int().positive(),
      username: z.string(),
    }),
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
    }),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
