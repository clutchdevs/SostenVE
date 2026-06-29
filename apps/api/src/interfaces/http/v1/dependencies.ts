import { getConfig } from '../../../config';
import { forService } from '../../../infrastructure/supabase/client-factory';
import { SupabaseCaseContactRepository, SupabaseCaseRepository } from '../../../infrastructure/repositories/supabase-case-repository';
import { SupabaseIdempotencyStore } from '../../../infrastructure/repositories/supabase-idempotency-store';
import type { IdempotencyStore } from '../../../application/intake/idempotency';
import type { IntakeDeps } from '../../../application/intake/types';

/**
 * Composition root for the intake feature. Builds use-case dependencies over the
 * service Supabase client (intake is anonymous, server-trusted). Lazy so build
 * and unit tests do not require secrets until an endpoint is actually hit.
 */
interface IntakeContainer {
  intakeDeps: IntakeDeps;
  idempotency: IdempotencyStore;
}

let cached: IntakeContainer | null = null;

export function getIntakeContainer(): IntakeContainer {
  if (cached === null) {
    const salt = process.env.PSEUDONYMIZATION_SALT;
    if (!salt) {
      throw new Error('Missing required environment variable: PSEUDONYMIZATION_SALT');
    }
    const client = forService();
    cached = {
      intakeDeps: {
        cases: new SupabaseCaseRepository(client),
        contacts: new SupabaseCaseContactRepository(client),
        config: getConfig(),
        pseudonymSalt: salt,
      },
      idempotency: new SupabaseIdempotencyStore(client),
    };
  }
  return cached;
}
