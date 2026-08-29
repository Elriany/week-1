import { describe, it, expect } from 'vitest';
import { reportQuerySchema, auditQuerySchema } from '../reports.schemas';

describe('reportQuerySchema', () => {
  it('fails with the error on from when from is after to', () => {
    const result = reportQuerySchema.safeParse({ from: '2030-01-01', to: '2020-01-01' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['from']);
  });

  it('rejects an unparseable date rather than yielding an Invalid Date', () => {
    expect(reportQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false);
  });

  it('both absent parses successfully to all-time', () => {
    const result = reportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('auditQuerySchema', () => {
  it('accepts an action string not present in AUDIT_ACTIONS — the deliberate non-enum choice', () => {
    expect(auditQuerySchema.safeParse({ action: 'SOME_FUTURE_ACTION' }).success).toBe(true);
  });
});
