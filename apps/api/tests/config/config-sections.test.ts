import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { appConfigSchema } from '../../src/config/schema.js';

/**
 * Guards that every environment section of config/app.config.yml validates against
 * the schema — so a broken `production:` (e.g. a missing email URL after the
 * shallow YAML merge) fails in CI, not at boot in production.
 */
const CONFIG_PATH = join(process.cwd(), '..', '..', 'config', 'app.config.yml');
const doc = load(readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;

describe('app.config.yml sections', () => {
  for (const env of ['development', 'test', 'production'] as const) {
    it(`validates the "${env}" section against the schema`, () => {
      const result = appConfigSchema.safeParse(doc[env]);
      if (!result.success) {
        // Surface the exact issue if it ever breaks.
        throw new Error(`${env} invalid: ${JSON.stringify(result.error.issues, null, 2)}`);
      }
      expect(result.success).toBe(true);
    });
  }

  it('routes production presence to upstash and email to smtp', () => {
    const prod = appConfigSchema.parse(doc.production);
    expect(prod.presence.provider).toBe('upstash');
    expect(prod.email.provider).toBe('smtp');
  });
});
