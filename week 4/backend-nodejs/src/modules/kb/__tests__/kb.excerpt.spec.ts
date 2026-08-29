import { describe, it, expect } from 'vitest';
import { excerpt } from '../kb.service';
import { KB_EXCERPT_LENGTH } from '../kb.constants';

describe('excerpt', () => {
  it('a body shorter than KB_EXCERPT_LENGTH comes back unchanged, with no trailing ellipsis', () => {
    const body = 'short body';
    expect(excerpt(body)).toBe(body);
    expect(excerpt(body).endsWith('…')).toBe(false);
  });

  it('a longer body is cut to exactly KB_EXCERPT_LENGTH characters plus one ellipsis', () => {
    const body = 'x'.repeat(KB_EXCERPT_LENGTH + 500);
    const result = excerpt(body);
    expect(result.length).toBe(KB_EXCERPT_LENGTH + 1);
    expect(result.endsWith('…')).toBe(true);
  });

  it('an Arabic body is cut without producing a broken surrogate', () => {
    const body = 'مرحبا '.repeat(100);
    const result = excerpt(body);
    expect(result.length).toBeLessThanOrEqual(KB_EXCERPT_LENGTH + 1);
    expect(() => Array.from(result)).not.toThrow();
  });
});
