import { describe, it, expect } from 'vitest';
import { upsertSlaPolicySchema } from '../sla.schemas';
import { SLA_POLICY_DEFAULTS } from '../sla.constants';

describe('upsertSlaPolicySchema', () => {
  it('rejects 0 and negative minutes', () => {
    expect(upsertSlaPolicySchema.safeParse({ responseTargetMinutes: 0, resolutionTargetMinutes: 100 }).success).toBe(false);
    expect(upsertSlaPolicySchema.safeParse({ responseTargetMinutes: -5, resolutionTargetMinutes: 100 }).success).toBe(false);
  });

  it('rejects resolutionTargetMinutes below responseTargetMinutes, with the error on the right path', () => {
    const result = upsertSlaPolicySchema.safeParse({ responseTargetMinutes: 100, resolutionTargetMinutes: 50 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['resolutionTargetMinutes']);
    }
  });

  it('accepts equal response and resolution targets', () => {
    expect(upsertSlaPolicySchema.safeParse({ responseTargetMinutes: 60, resolutionTargetMinutes: 60 }).success).toBe(true);
  });
});

describe('SLA_POLICY_DEFAULTS', () => {
  it('covers exactly the four seeded priority codes', () => {
    expect(SLA_POLICY_DEFAULTS.map(d => d.priorityCode).sort()).toEqual(['HIGH', 'LOW', 'MEDIUM', 'URGENT']);
  });

  it('every entry satisfies resolution >= response', () => {
    for (const entry of SLA_POLICY_DEFAULTS) {
      expect(entry.resolutionTargetMinutes).toBeGreaterThanOrEqual(entry.responseTargetMinutes);
    }
  });
});
