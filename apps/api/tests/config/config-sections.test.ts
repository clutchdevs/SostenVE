import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { appConfigSchema } from '../../src/config/schema.js';
import { CONFIG_SECTIONS } from '../../src/config/app-config.generated.js';

/**
 * Guards the config: every environment section of the GENERATED config (what the
 * app actually loads) validates against the schema, and the generated module is in
 * sync with the YAML source — so editing the YAML without running
 * `npm run config:build` fails in CI, not at boot in production.
 */
const YAML_PATH = join(process.cwd(), 'config', 'app.config.yml');
const yamlDoc = load(readFileSync(YAML_PATH, 'utf8')) as Record<string, unknown>;

describe('app config sections', () => {
  for (const env of ['development', 'test', 'production'] as const) {
    it(`validates the "${env}" section against the schema`, () => {
      const result = appConfigSchema.safeParse(CONFIG_SECTIONS[env]);
      if (!result.success) {
        throw new Error(`${env} invalid: ${JSON.stringify(result.error.issues, null, 2)}`);
      }
      expect(result.success).toBe(true);
    });
  }

  it('routes production presence to upstash and email to smtp', () => {
    const prod = appConfigSchema.parse(CONFIG_SECTIONS.production);
    expect(prod.presence.provider).toBe('upstash');
    expect(prod.email.provider).toBe('smtp');
  });

  it('the generated module is in sync with app.config.yml (run `npm run config:build`)', () => {
    // JSON round-trip normalises the YAML doc to the same shape the generator emits.
    expect(CONFIG_SECTIONS).toEqual(JSON.parse(JSON.stringify(yamlDoc)));
  });
});
