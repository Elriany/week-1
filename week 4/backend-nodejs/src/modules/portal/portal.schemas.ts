import { z } from 'zod';

/**
 * The support web form. Deliberately does NOT accept customerId, branchId,
 * departmentId, or channel — all four are resolved from the account. A body
 * carrying them is stripped by Zod, not rejected.
 */
export const portalCreateTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  categoryId: z.string().uuid().nullish(),
  priorityCode: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const portalListTicketsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  statusId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  slaStatus: z.enum(['ON_TRACK', 'AT_RISK', 'BREACHED', 'MET']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ticketNumber']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const portalCreateNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const portalTicketIdParamSchema = z.object({ id: z.string().uuid() });

export const portalChildIdParamSchema = z.object({ id: z.string().uuid(), childId: z.string().uuid() });

export const portalListHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
