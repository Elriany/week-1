import { z } from 'zod';
import { passwordSchema } from '../auth/auth.schemas';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullNameEn: z.string().min(1).max(200),
  fullNameAr: z.string().min(1).max(200),
  roleId: z.string().uuid(),
  branchId: z.string().uuid(),
  departmentId: z.string().uuid(),
});

export const updateUserSchema = z
  .object({
    fullNameEn: z.string().min(1).max(200).optional(),
    fullNameAr: z.string().min(1).max(200).optional(),
    roleId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});
