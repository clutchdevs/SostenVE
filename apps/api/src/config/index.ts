import { CONFIG_SECTIONS } from './app-config.generated.js';
import { appConfigSchema, type AppConfig } from './schema.js';

/**
 * Configuration singleton.
 *
 * The config is generated from `apps/api/config/app.config.yml` into an imported
 * module (`app-config.generated.ts`, via `npm run config:build`), so the bundler
 * always ships it in the serverless function — no filesystem read at runtime
 * (reading the YAML failed on Vercel: it isn't in the function bundle). Selects the
 * section for the current NODE_ENV (falling back to `development`), validates it
 * with Zod and exposes a typed, immutable object. No other module should read the
 * config directly — everyone consumes the validated {@link getConfig}.
 */
function loadConfig(): AppConfig {
  const env = process.env.NODE_ENV ?? 'development';
  const section = CONFIG_SECTIONS[env] ?? CONFIG_SECTIONS['development'];
  if (!section) {
    throw new Error(`No configuration section for environment "${env}"`);
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
