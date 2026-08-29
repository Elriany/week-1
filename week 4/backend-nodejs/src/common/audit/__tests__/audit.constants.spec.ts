import { describe, it, expect } from 'vitest';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, AUDIT_DETAILS_MAX } from '../audit.constants';

describe('audit constants', () => {
  it('gives every action value the same string as its key', () => {
    for (const [key, value] of Object.entries(AUDIT_ACTIONS)) {
      expect(value).toBe(key);
    }
  });

  it('gives every entity type a unique value', () => {
    const values = Object.values(AUDIT_ENTITY_TYPES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('caps details at 2000, matching the entity column length', () => {
    expect(AUDIT_DETAILS_MAX).toBe(2000);
  });
});
