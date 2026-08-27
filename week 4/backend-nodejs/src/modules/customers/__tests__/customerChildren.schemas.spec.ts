import { describe, it, expect } from 'vitest';
import {
  createContactSchema,
  updateContactSchema,
  noteBodySchema,
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
});
