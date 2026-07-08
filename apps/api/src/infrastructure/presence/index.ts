import type { AppConfig } from '../../config/index.js';
import type { PresenceStore } from '../../application/presence/ports.js';
import { MemoryPresenceStore } from './memory-presence-store.js';
import { UpstashPresenceStore } from './upstash-presence-store.js';

/**
 * Builds the presence store from config (RF-2.5). `memory` is the offline-safe
 * default for dev/tests; `upstash` is the production Redis store and requires the
 * Upstash REST credentials in the environment. A single instance is reused so the
 * in-memory adapter keeps its map across requests within a process.
 */
let cached: PresenceStore | null = null;

export function createPresenceStore(config: AppConfig): PresenceStore {
  if (cached) return cached;

  if (config.presence.provider === 'upstash') {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'presence.provider is "upstash" but UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set',
      );
    }
    cached = new UpstashPresenceStore(url, token);
  } else {
    cached = new MemoryPresenceStore();
  }
  return cached;
}
