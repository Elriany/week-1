import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  customerId: z.string().uuid(),
  departmentId: z.string().uuid(),
  priorityId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  branchId: z.string().uuid(),
});

export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    priorityId: z.string().uuid().optional(),
    categoryId: z.string().uuid().nullish(),
    departmentId: z.string().uuid().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const ticketIdParamSchema = z.object({ id: z.string().uuid() });

export const listTicketsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  unassigned: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ticketNumber', 'priority']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const transitionTicketSchema = z.object({
  statusId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export const assignTicketSchema = z.object({
  assignedUserId: z.string().uuid().nullable(),
  note: z.string().trim().max(500).optional(),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
