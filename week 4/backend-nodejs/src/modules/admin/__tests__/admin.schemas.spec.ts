import { describe, it, expect } from 'vitest';
import { updateReferenceSchema, createReferenceSchema } from '../referenceData.schemas';
import { linkCustomerSchema } from '../../users/users.schemas';
import { updateBranchSchema, createBranchSchema } from '../../branches/branches.schemas';
import { updateDepartmentSchema, createDepartmentSchema } from '../../departments/departments.schemas';

describe('admin update schemas', () => {
  it('no update schema in this story has a code key', () => {
    for (const schema of [updateReferenceSchema, updateBranchSchema, updateDepartmentSchema]) {
      const result = schema.safeParse({ code: 'X', nameEn: 'Y' } as any);
      if (result.success) {
        expect(result.data).not.toHaveProperty('code');
      }
    }
  });
});

describe('linkCustomerSchema', () => {
  it('rejects an omitted customerId', () => {
    expect(linkCustomerSchema.safeParse({}).success).toBe(false);
  });

  it('accepts an explicit null', () => {
    expect(linkCustomerSchema.safeParse({ customerId: null }).success).toBe(true);
  });
});

describe('sortOrder validation', () => {
  it('rejects negatives and accepts 0', () => {
    expect(createReferenceSchema.safeParse({ code: 'X', nameEn: 'Y', nameAr: 'Z', sortOrder: -1 }).success).toBe(false);
    expect(createReferenceSchema.safeParse({ code: 'X', nameEn: 'Y', nameAr: 'Z', sortOrder: 0 }).success).toBe(true);
  });
});

describe('branch and department create schemas', () => {
  it('require code, nameEn, and nameAr', () => {
    expect(createBranchSchema.safeParse({ nameEn: 'X', nameAr: 'Y' }).success).toBe(false);
    expect(createBranchSchema.safeParse({ code: 'X', nameEn: 'Y', nameAr: 'Z' }).success).toBe(true);
    expect(createDepartmentSchema.safeParse({ nameEn: 'X', nameAr: 'Y' }).success).toBe(false);
  });
});
