import { describe, it, expect } from 'vitest';
import { createTicketSchema, updateTicketSchema, listTicketsQuerySchema } from '../tickets.schemas';

describe('Ticket schemas', () => {
  describe('createTicketSchema', () => {
    it('rejects empty subject', () => {
      expect(() => createTicketSchema.parse({ subject: '', description: 'test', customerId: '123e4567-e89b-12d3-a456-426614174000', departmentId: '123e4567-e89b-12d3-a456-426614174000', priorityId: '123e4567-e89b-12d3-a456-426614174000', branchId: '123e4567-e89b-12d3-a456-426614174000' })).toThrow();
    });

    it('rejects whitespace-only subject', () => {
      expect(() => createTicketSchema.parse({ subject: '   ', description: 'test', customerId: '123e4567-e89b-12d3-a456-426614174000', departmentId: '123e4567-e89b-12d3-a456-426614174000', priorityId: '123e4567-e89b-12d3-a456-426614174000', branchId: '123e4567-e89b-12d3-a456-426614174000' })).toThrow();
    });

    it('rejects subject over 300 chars', () => {
      expect(() => createTicketSchema.parse({ subject: 'x'.repeat(301), description: 'test', customerId: '123e4567-e89b-12d3-a456-426614174000', departmentId: '123e4567-e89b-12d3-a456-426614174000', priorityId: '123e4567-e89b-12d3-a456-426614174000', branchId: '123e4567-e89b-12d3-a456-426614174000' })).toThrow();
    });

    it('rejects description over 4000 chars', () => {
      expect(() => createTicketSchema.parse({ subject: 'test', description: 'x'.repeat(4001), customerId: '123e4567-e89b-12d3-a456-426614174000', departmentId: '123e4567-e89b-12d3-a456-426614174000', priorityId: '123e4567-e89b-12d3-a456-426614174000', branchId: '123e4567-e89b-12d3-a456-426614174000' })).toThrow();
    });

    it('accepts categoryId as uuid', () => {
      const result = createTicketSchema.parse({
        subject: 'test',
        description: 'test',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        departmentId: '123e4567-e89b-12d3-a456-426614174000',
        priorityId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: '223e4567-e89b-12d3-a456-426614174000',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.categoryId).toBe('223e4567-e89b-12d3-a456-426614174000');
    });

    it('accepts categoryId as null', () => {
      const result = createTicketSchema.parse({
        subject: 'test',
        description: 'test',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        departmentId: '123e4567-e89b-12d3-a456-426614174000',
        priorityId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: null,
        branchId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.categoryId).toBeNull();
    });
  });

  describe('updateTicketSchema', () => {
    it('rejects empty object', () => {
      expect(() => updateTicketSchema.parse({})).toThrow();
    });

    it('accepts partial updates', () => {
      const result = updateTicketSchema.parse({ subject: 'updated' });
      expect(result.subject).toBe('updated');
    });
  });

  describe('listTicketsQuerySchema', () => {
    it('coerces unassigned: "true" to boolean', () => {
      const result = listTicketsQuerySchema.parse({ unassigned: 'true' });
      expect(result.unassigned).toBe(true);
    });

    it('rejects invalid sortBy', () => {
      expect(() => listTicketsQuerySchema.parse({ sortBy: 'password' })).toThrow();
    });

    it('rejects pageSize over 100', () => {
      expect(() => listTicketsQuerySchema.parse({ pageSize: 500 })).toThrow();
    });
  });
});
