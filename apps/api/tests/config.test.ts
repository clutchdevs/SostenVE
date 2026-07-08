import { describe, expect, it } from 'vitest';
import { getConfig } from '../src/config/index.js';

describe('config singleton', () => {
  it('loads and validates the configuration', () => {
    const config = getConfig();
    expect(config.app.locale).toBe('es-VE');
  });

  it('exposes the triage escalation threshold from app.config.yml', () => {
    expect(getConfig().triage.orange_tags_threshold_for_escalation).toBe(3);
  });

  it('returns the same frozen instance on repeated calls', () => {
    expect(getConfig()).toBe(getConfig());
    expect(Object.isFrozen(getConfig())).toBe(true);
  });
});
