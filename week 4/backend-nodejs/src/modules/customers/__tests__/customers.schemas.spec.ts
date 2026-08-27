import { describe, it, expect } from 'vitest';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  customerIdParamSchema,
} from '../customers.schemas';

describe('customers.schemas', () => {
  describe('createCustomerSchema', () => {
    it('accepts a payload with code omitted', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: 'John Smith',
        fullNameAr: 'جون سميث',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects fullNameEn: ""', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: '',
        fullNameAr: 'جون سميث',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(false);
    });

    it('rejects fullNameAr over 200 characters', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'a'.repeat(201),
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(false);
    });

    it('accepts email: null', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: 'John Smith',
        fullNameAr: 'جون سميث',
        email: null,
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects email: "not-an-email"', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: 'John Smith',
        fullNameAr: 'جون سميث',
        email: 'not-an-email',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(false);
    });

    it('accepts preferredLanguage: "en" and "ar"', () => {
      const en = createCustomerSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'جون',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        preferredLanguage: 'en',
      });
      expect(en.success).toBe(true);

      const ar = createCustomerSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'جون',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        preferredLanguage: 'ar',
      });
      expect(ar.success).toBe(true);
    });

    it('rejects preferredLanguage: "fr"', () => {
      const result = createCustomerSchema.safeParse({
        fullNameEn: 'John',
        fullNameAr: 'جون',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        preferredLanguage: 'fr',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCustomerSchema', () => {
    it('rejects {}', () => {
      const result = updateCustomerSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('At least one field'))).toBe(true);
      }
    });

    it('accepts fullNameEn alone', () => {
      const result = updateCustomerSchema.safeParse({ fullNameEn: 'New Name' });
      expect(result.success).toBe(true);
    });
  });

  describe('listCustomersQuerySchema', () => {
    it('coerces page: "2" to number 2', () => {
      const result = listCustomersQuerySchema.safeParse({ page: '2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
      }
    });

    it('transforms isActive: "false" to false', () => {
      const result = listCustomersQuerySchema.safeParse({ isActive: 'false' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });

    it('rejects pageSize: "500"', () => {
      const result = listCustomersQuerySchema.safeParse({ pageSize: '500' });
      expect(result.success).toBe(false);
    });
  });

  describe('customerIdParamSchema', () => {
    it('accepts a valid UUID', () => {
      const result = customerIdParamSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid UUID', () => {
      const result = customerIdParamSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});
