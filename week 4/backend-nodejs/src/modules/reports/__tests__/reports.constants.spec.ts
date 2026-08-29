import { describe, it, expect } from 'vitest';
import { OPEN_STATUS_CODES, CLOSED_STATUS_CODES } from '../reports.constants';
import { TICKET_STATUS_CODES } from '../../tickets/ticket.constants';

describe('OPEN_STATUS_CODES / CLOSED_STATUS_CODES', () => {
  it('are disjoint and together cover every key of TICKET_STATUS_CODES', () => {
    const all = Object.values(TICKET_STATUS_CODES);
    const union = new Set([...OPEN_STATUS_CODES, ...CLOSED_STATUS_CODES]);
    expect(union.size).toBe(all.length);
    for (const code of all) expect(union.has(code)).toBe(true);
    const intersection = OPEN_STATUS_CODES.filter(c => (CLOSED_STATUS_CODES as string[]).includes(c));
    expect(intersection).toHaveLength(0);
  });

  it('CLOSED_STATUS_CODES is exactly [RESOLVED, CLOSED]', () => {
    expect(CLOSED_STATUS_CODES).toEqual(['RESOLVED', 'CLOSED']);
  });
});
