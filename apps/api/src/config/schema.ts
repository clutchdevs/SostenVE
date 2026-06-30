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
  fpv: z.object({
    verifier: z.enum(['dummy', 'http']),
    circuit_breaker: z.object({
      failure_threshold: z.number().int().positive(),
      cooldown_seconds: z.number().int().positive(),
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
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
