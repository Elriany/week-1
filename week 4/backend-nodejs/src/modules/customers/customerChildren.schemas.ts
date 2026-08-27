import { z } from 'zod';

export const createContactSchema = z.object({
  fullNameEn: z.string().min(1).max(200),
  fullNameAr: z.string().min(1).max(200),
  jobTitle: z.string().max(150).nullish(),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const noteBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const customerChildParamSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
});
