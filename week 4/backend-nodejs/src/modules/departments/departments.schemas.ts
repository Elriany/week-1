import { z } from 'zod';

export const createDepartmentSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
});

export const updateDepartmentSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().min(1).max(200).optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const departmentIdParamSchema = z.object({ id: z.string().uuid() });

export const setActiveSchema = z.object({ isActive: z.boolean() });

export const listDepartmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  includeInactive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});
