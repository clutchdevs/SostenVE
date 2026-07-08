import { describe, expect, it } from 'vitest';
import { classifyInitialBranch } from '../../../src/application/intake/triage-initial.js';

describe('classifyInitialBranch', () => {
  it('routes the critical Likert answer to the red branch', () => {
    expect(classifyInitialBranch(1, 1)).toBe('RED');
  });

  it('routes non-critical answers to the green branch', () => {
    expect(classifyInitialBranch(2, 1)).toBe('GREEN');
    expect(classifyInitialBranch(5, 1)).toBe('GREEN');
  });
});
