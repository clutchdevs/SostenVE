import type { Context, MiddlewareHandler } from 'hono';
import type { ZodType } from 'zod';
import { ValidationError } from '../../../shared/errors/api-error';

/**
 * Input validation at the API edge with Zod. Runs in the controller BEFORE the
 * request reaches application/domain — no use case trusts that the frontend
 * already validated. Validated data is stored on the context for the handler.
 */
type ValidationTarget = 'body' | 'query';

const VALIDATED_KEY = 'validated' as const;

async function readTarget(c: Context, target: ValidationTarget): Promise<unknown> {
  if (target === 'query') {
    return c.req.query();
  }
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
}

function validate<T>(target: ValidationTarget, schema: ZodType<T>): MiddlewareHandler {
  return async (c, next) => {
    const raw = await readTarget(c, target);
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new ValidationError('Invalid request', result.error.flatten());
    }
    const current = (c.get(VALIDATED_KEY) as Record<string, unknown> | undefined) ?? {};
    c.set(VALIDATED_KEY, { ...current, [target]: result.data });
    await next();
  };
}

export function validateBody<T>(schema: ZodType<T>): MiddlewareHandler {
  return validate('body', schema);
}

export function validateQuery<T>(schema: ZodType<T>): MiddlewareHandler {
  return validate('query', schema);
}

/** Reads validated data previously set by {@link validateBody}/{@link validateQuery}. */
export function getValidated<T>(c: Context, target: ValidationTarget): T {
  const bag = c.get(VALIDATED_KEY) as Record<string, unknown> | undefined;
  return bag?.[target] as T;
}
