import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { load } from 'js-yaml';
import { appConfigSchema, type AppConfig } from './schema.js';

/**
 * Configuration singleton.
 *
 * Loads `config/app.config.yml` exactly once, selects the section for the current
 * NODE_ENV (falling back to `development`), validates it with Zod and exposes a
 * typed, immutable object. No other module should read the YAML file directly —
 * everyone consumes the validated config returned by {@link getConfig}.
 */

const CONFIG_RELATIVE_PATH = join('config', 'app.config.yml');

/** Walks up from the current working directory until it finds the config file. */
function resolveConfigPath(): string {
  const override = process.env.APP_CONFIG_PATH;
  if (override) {
    return override;
  }

  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, CONFIG_RELATIVE_PATH);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not locate ${CONFIG_RELATIVE_PATH} starting from ${process.cwd()}`,
      );
    }
    dir = parent;
  }
}

function loadConfig(): AppConfig {
  const env = process.env.NODE_ENV ?? 'development';
  const filePath = resolveConfigPath();
  const document = load(readFileSync(filePath, 'utf8')) as Record<string, unknown> | undefined;

  const section = document?.[env] ?? document?.['development'];
  if (!section) {
    throw new Error(`No configuration section for environment "${env}" in ${filePath}`);
  }

  return Object.freeze(appConfigSchema.parse(section));
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig === null) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export type { AppConfig };
