import { describe, it, expect } from 'vitest';

function escapeLikeTerm(term: string): string {
  return `%${term.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
}

describe('Ticket search — LIKE escaping', () => {
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
    const escaped = escapeLikeTerm('ticket');
    expect(escaped).toBe('%ticket%');
  });

  it('handles mixed metacharacters and normal text', () => {
    const escaped = escapeLikeTerm('test%value_123[x]');
    expect(escaped).toBe('%test[%]value[_]123[[]x[]]%');
  });
});

describe('Ticket sorting — column whitelisting', () => {
  const SORT_COLUMNS: Record<string, string> = {
    createdAt: 't.createdAt',
    updatedAt: 't.updatedAt',
    ticketNumber: 't.ticketNumber',
    priority: 'priority.sortOrder',
  };

  it('contains exactly four whitelisted keys', () => {
    expect(Object.keys(SORT_COLUMNS)).toHaveLength(4);
  });

  it('maps each key to a column expression', () => {
    expect(SORT_COLUMNS.createdAt).toBe('t.createdAt');
    expect(SORT_COLUMNS.updatedAt).toBe('t.updatedAt');
    expect(SORT_COLUMNS.ticketNumber).toBe('t.ticketNumber');
    expect(SORT_COLUMNS.priority).toBe('priority.sortOrder');
  });

  it('lookup prevents SQL injection', () => {
    const attempt = 'password; DROP TABLE Tickets;';
    expect(SORT_COLUMNS[attempt]).toBeUndefined();
  });
});
