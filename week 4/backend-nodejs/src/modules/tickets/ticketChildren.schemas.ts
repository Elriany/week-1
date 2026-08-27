import { z } from 'zod';

export const createTicketNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  isInternal: z.boolean().default(true),
});

export const updateTicketNoteSchema = createTicketNoteSchema
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const ticketChildParamSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
});
