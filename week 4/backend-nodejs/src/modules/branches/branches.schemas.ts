import { z } from 'zod';

export const createBranchSchema = z.object({
  code: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
});

// `code` is deliberately absent — it is immutable once created.
export const updateBranchSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().min(1).max(200).optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const branchIdParamSchema = z.object({ id: z.string().uuid() });

export const setActiveSchema = z.object({ isActive: z.boolean() });

export const listBranchesQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});
