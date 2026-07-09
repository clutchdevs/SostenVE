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
  return Object.freeze(applyWebBaseUrlOverride(appConfigSchema.parse(section)));
}

/**
 * The web-facing links emailed to users (login, coordinator invitation, password
 * reset) are baked into config with placeholder origins. When `WEB_BASE_URL` is
 * set, rebase all three onto that origin — keeping each URL's path — so the
 * deployed web URL can be configured per-environment (Vercel) without editing the
 * committed config. Unset → the config values are used verbatim.
 */
function applyWebBaseUrlOverride(config: AppConfig): AppConfig {
  const base = process.env.WEB_BASE_URL;
  if (!base) return config;
  const rebase = (url: string): string => {
    try {
      return new URL(new URL(url).pathname, base).href;
    } catch {
      return url;
    }
  };
  return {
    ...config,
    email: {
      ...config.email,
      login_url: rebase(config.email.login_url),
      coordinator_invite_url: rebase(config.email.coordinator_invite_url),
      password_reset_url: rebase(config.email.password_reset_url),
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig === null) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export type { AppConfig };
