import { describe, it, expect } from 'vitest';

function escapeLikeTerm(term: string): string {
  return `%${term.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
}

describe('customers search — LIKE escaping', () => {
  it('brackets %', () => {
    const escaped = escapeLikeTerm('%');
    expect(escaped).toBe('%[%]%');
  });

  it('brackets _', () => {
    const escaped = escapeLikeTerm('_');
    expect(escaped).toBe('%[_]%');
  });

  it('brackets [', () => {
    const escaped = escapeLikeTerm('[');
    expect(escaped).toBe('%[[]%');
  });

  it('does not bracket normal characters', () => {
    const escaped = escapeLikeTerm('john');
    expect(escaped).toBe('%john%');
  });

  it('handles mixed metacharacters and normal text', () => {
    const escaped = escapeLikeTerm('test%value_123[x]');
    expect(escaped).toBe('%test[%]value[_]123[[]x[]]%');
  });
});
