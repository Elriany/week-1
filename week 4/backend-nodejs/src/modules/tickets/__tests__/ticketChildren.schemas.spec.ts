import { describe, it, expect } from 'vitest';
import { createTicketNoteSchema, updateTicketNoteSchema, ticketChildParamSchema } from '../ticketChildren.schemas';

describe('Ticket Children Schemas', () => {
  describe('createTicketNoteSchema', () => {
    it('should validate a valid create note request', () => {
      const data = {
        body: 'This is a test note',
        isInternal: true,
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use isInternal default value of true', () => {
      const data = {
        body: 'This is a test note',
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isInternal).toBe(true);
      }
    });

    it('should reject empty body', () => {
      const data = {
        body: '',
        isInternal: true,
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject body exceeding 4000 characters', () => {
      const data = {
        body: 'x'.repeat(4001),
        isInternal: true,
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept body with exactly 4000 characters', () => {
      const data = {
        body: 'x'.repeat(4000),
        isInternal: true,
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from body', () => {
      const data = {
        body: '  test note  ',
        isInternal: false,
      };
      const result = createTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe('test note');
      }
    });
  });

  describe('updateTicketNoteSchema', () => {
    it('should validate a partial update with body only', () => {
      const data = {
        body: 'Updated note',
      };
      const result = updateTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate a partial update with isInternal only', () => {
      const data = {
        isInternal: false,
      };
      const result = updateTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate a full update with both fields', () => {
      const data = {
        body: 'Updated note',
        isInternal: false,
      };
      const result = updateTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty object', () => {
      const data = {};
      const result = updateTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty body string', () => {
      const data = {
        body: '',
      };
      const result = updateTicketNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('ticketChildParamSchema', () => {
    it('should validate valid UUID parameters', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        childId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = ticketChildParamSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for id', () => {
      const data = {
        id: 'not-a-uuid',
        childId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = ticketChildParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for childId', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        childId: 'not-a-uuid',
      };
      const result = ticketChildParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const data = {
        childId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = ticketChildParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing childId', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = ticketChildParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
