import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  fullNameEn: z.string().min(1).max(200),
  fullNameAr: z.string().min(1).max(200),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  preferredLanguage: z.enum(['en', 'ar']).optional(),
  branchId: z.string().uuid(),
});

export const updateCustomerSchema = z
  .object({
    fullNameEn: z.string().min(1).max(200).optional(),
    fullNameAr: z.string().min(1).max(200).optional(),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    preferredLanguage: z.enum(['en', 'ar']).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const customerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCustomersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  branchId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const setCustomerActiveSchema = z.object({
  isActive: z.boolean(),
});
