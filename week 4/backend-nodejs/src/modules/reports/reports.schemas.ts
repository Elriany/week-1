import { z } from 'zod';

const isoDate = z.coerce.date().refine(d => !Number.isNaN(d.getTime()), { message: 'Invalid date' });

export const reportQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    branchId: z.string().uuid().optional(),
  })
  .refine(d => !d.from || !d.to || d.from <= d.to, {
    message: 'from must not be after to',
    path: ['from'],
  });

export const auditQuerySchema = z.object({
  entityType: z.string().max(60).optional(),
  action: z.string().max(60).optional(),
  entityId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
