/**
 * Central structured logger (Facade) with automatic PII/clinical redaction.
 *
 * This is the ONLY allowed way to log in the API (see CONTRIBUTING.md). Domain
 * objects (Case, ClinicalNote, Volunteer, ...) must never be logged raw — pass
 * them through here and any sensitive field is redacted before it is written.
 *
 * Writes one JSON line to stdout (info/warn) or stderr (error). It does not use
 * `console`, so it complies with the no-console rule enforced in src.
 */
export type LogLevel = 'info' | 'warn' | 'error';

/** Field names whose values are redacted, matched case-insensitively. */
const SENSITIVE_KEYS = new Set(
  [
    'name',
    'fullName',
    'full_name',
    'contact',
    'phone',
    'cedula',
    'professionalId',
    'professional_id',
    'diagnosis',
    'diagnosisEncrypted',
    'diagnosis_encrypted',
    'content',
    'contentEncrypted',
    'content_encrypted',
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'jwt',
    'secret',
    'salt',
    'authorization',
    'encryptionKey',
    'encryption_key',
  ].map((k) => k.toLowerCase()),
);

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return '[TRUNCATED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) as Record<string, unknown> } : {}),
  });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};

/** Exposed for unit testing the redaction logic. */
export const __redactForTest = redact;
