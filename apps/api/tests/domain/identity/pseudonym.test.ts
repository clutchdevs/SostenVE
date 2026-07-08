import { describe, expect, it } from 'vitest';
import { generatePseudonymId } from '../../../src/domain/identity/pseudonym.js';

const SALT = 'test-secret-salt';

describe('generatePseudonymId (ADR-0011)', () => {
  it('is deterministic for the same input and salt', () => {
    expect(generatePseudonymId('+584120000000', SALT)).toBe(
      generatePseudonymId('+584120000000', SALT),
    );
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(generatePseudonymId('  AbC123  ', SALT)).toBe(generatePseudonymId('abc123', SALT));
  });

  it('produces a different id with a different salt', () => {
    expect(generatePseudonymId('+584120000000', SALT)).not.toBe(
      generatePseudonymId('+584120000000', 'another-salt'),
    );
  });

  it('is opaque (does not contain the natural key)', () => {
    const id = generatePseudonymId('+584120000000', SALT);
    expect(id).not.toContain('584120000000');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects empty input or salt', () => {
    expect(() => generatePseudonymId('', SALT)).toThrow();
    expect(() => generatePseudonymId('x', '')).toThrow();
  });
});
