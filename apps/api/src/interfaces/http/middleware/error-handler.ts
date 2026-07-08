import type { Context } from 'hono';
import { ZodError } from 'zod';
import { ApiError, ValidationError } from '../../../shared/errors/api-error';
import { DomainError } from '../../../domain/shared/domain-error';
import { logger } from '../../../shared/logger';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Central error handler (wired via `app.onError`). Maps known error types to safe
 * JSON responses and never leaks internal details/stack traces to clients.
 */
export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof ApiError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    if (err instanceof ValidationError && err.details !== undefined) {
      body.error.details = err.details;
    }
    return c.json(body, err.status as never);
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() },
    };
    return c.json(body, 400);
  }

  if (err instanceof DomainError) {
    // Domain invariant violated by the request -> unprocessable entity.
    return c.json({ error: { code: 'DOMAIN_RULE_VIOLATION', message: err.message } }, 422);
  }

  // Unknown/unexpected error: log it for observability (never leaked to the client).
  logger.error('unhandled error', {
    name: err.name,
    errorMessage: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
}
