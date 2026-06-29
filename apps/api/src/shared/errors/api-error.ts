/**
 * HTTP-facing error hierarchy. Controllers and middleware throw these; the
 * error-handler maps them to JSON responses. Messages must never carry PII or
 * clinical content (see CONTRIBUTING.md).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends ApiError {
  readonly details?: unknown;

  constructor(message = 'Invalid request', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class TooManyRequestsError extends ApiError {
  readonly retryAfterSeconds?: number;

  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super(429, 'TOO_MANY_REQUESTS', message);
    this.name = 'TooManyRequestsError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
