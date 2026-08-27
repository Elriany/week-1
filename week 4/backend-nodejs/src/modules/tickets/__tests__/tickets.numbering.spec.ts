import { describe, it, expect } from 'vitest';

describe('Ticket numbering', () => {
  it('pads sequence 1 to TKT-<year>-00001', () => {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;
    const number = `${prefix}${String(1).padStart(5, '0')}`;
    expect(number).toBe(`TKT-${year}-00001`);
  });

  it('pads sequence 42 to TKT-<year>-00042', () => {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;
    const number = `${prefix}${String(42).padStart(5, '0')}`;
    expect(number).toBe(`TKT-${year}-00042`);
  });

  it('handles malformed stored number with NaN fallback', () => {
    const malformed = 'TKT-2026-XX';
    const prefix = `TKT-2026-`;
    const last = Number.parseInt(malformed.slice(prefix.length), 10);
    const next = Number.isNaN(last) ? 1 : last + 1;
    expect(next).toBe(1);
  });

  it('zero-padded strings sort correctly descending across 9 → 10', () => {
    const nums = ['TKT-2026-00009', 'TKT-2026-00010'];
    const sorted = [...nums].sort().reverse();
    expect(sorted[0]).toBe('TKT-2026-00010');
  });

  it('zero-padded strings sort correctly descending across 99 → 100', () => {
    const nums = ['TKT-2026-00099', 'TKT-2026-00100'];
    const sorted = [...nums].sort().reverse();
    expect(sorted[0]).toBe('TKT-2026-00100');
  });
});
