import { describe, it, expect } from 'vitest';
import {
  createContactSchema,
  updateContactSchema,
  noteBodySchema,
  customerHistoryQuerySchema,
  customerChildParamSchema,
} from '../customerChildren.schemas';

describe('customerChildren.schemas', () => {
  describe('noteBodySchema', () => {
    it('rejects pure whitespace', () => {
      const result = noteBodySchema.safeParse({ body: '   ' });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = noteBodySchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('accepts 4000 characters', () => {
      const result = noteBodySchema.safeParse({ body: 'a'.repeat(4000) });
      expect(result.success).toBe(true);
    });

    it('rejects 4001 characters', () => {
      const result = noteBodySchema.safeParse({ body: 'a'.repeat(4001) });
      expect(result.success).toBe(false);
    });
  });

  describe('createContactSchema', () => {
    it('accepts jobTitle: null', () => {
      const result = createContactSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'جون',
        jobTitle: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects malformed email', () => {
      const result = createContactSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'جون',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateContactSchema', () => {
    it('rejects empty object', () => {
      const result = updateContactSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts partial update with one field', () => {
      const result = updateContactSchema.safeParse({ fullNameEn: 'Updated Name' });
      expect(result.success).toBe(true);
    });
  });

  describe('customerChildParamSchema', () => {
    it('rejects non-uuid childId', () => {
      const result = customerChildParamSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts both ids as valid uuids', () => {
      const result = customerChildParamSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: '223e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });
  });
describe('customerHistoryQuerySchema', () => {
    it('accepts an empty query, leaving the handler defaults to apply', () => {
      const result = customerHistoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.page).toBeUndefined();
      expect(result.data?.pageSize).toBeUndefined();
    });

    it('coerces numeric strings from the query string', () => {
      const result = customerHistoryQuerySchema.safeParse({ page: '2', pageSize: '50' });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(2);
      expect(result.data?.pageSize).toBe(50);
    });

    it('rejects a pageSize above the 100 cap', () => {
      expect(customerHistoryQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
    });

    it('rejects page 0 and negative pages', () => {
      expect(customerHistoryQuerySchema.safeParse({ page: '0' }).success).toBe(false);
      expect(customerHistoryQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
    });

    it('rejects a non-numeric page', () => {
      expect(customerHistoryQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    });

    it('rejects a fractional pageSize', () => {
      expect(customerHistoryQuerySchema.safeParse({ pageSize: '2.5' }).success).toBe(false);
    });
  });
});
