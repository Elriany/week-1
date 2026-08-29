import { z } from 'zod';

export const priorityIdParamSchema = z.object({ priorityId: z.string().uuid() });

export const upsertSlaPolicySchema = z
  .object({
    responseTargetMinutes: z.coerce.number().int().min(1).max(100000),
    resolutionTargetMinutes: z.coerce.number().int().min(1).max(100000),
    isActive: z.boolean().optional(),
  })
  .refine(d => d.resolutionTargetMinutes >= d.responseTargetMinutes, {
    message: 'Resolution target must be at least the response target',
    path: ['resolutionTargetMinutes'],
  });
