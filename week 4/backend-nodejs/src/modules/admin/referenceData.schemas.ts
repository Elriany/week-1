import { z } from 'zod';

export const referenceKindParamSchema = z.object({
  kind: z.enum(['categories', 'priorities', 'statuses']),
});

export const referenceIdParamSchema = z.object({
  kind: z.enum(['categories', 'priorities', 'statuses']),
  id: z.string().uuid(),
});

export const createReferenceSchema = z.object({
  code: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

// No `code` field — it is immutable once created, for every kind including statuses.
export const updateReferenceSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().min(1).max(200).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const setActiveSchema = z.object({ isActive: z.boolean() });

export const listReferenceQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});
