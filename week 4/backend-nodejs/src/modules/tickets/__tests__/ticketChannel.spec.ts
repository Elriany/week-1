import { describe, it, expect } from 'vitest';
import { TICKET_CHANNELS, DEFAULT_TICKET_CHANNEL } from '../ticket.constants';
import { createTicketSchema, listTicketsQuerySchema } from '../tickets.schemas';

describe('TICKET_CHANNELS', () => {
  it('contains exactly WEB, PHONE, EMAIL', () => {
    expect(Object.values(TICKET_CHANNELS).sort()).toEqual(['EMAIL', 'PHONE', 'WEB']);
  });

  it('defaults to WEB', () => {
    expect(DEFAULT_TICKET_CHANNEL).toBe('WEB');
  });
});

const validCreateBody = {
  subject: 'Subject',
  description: 'Description',
  customerId: '11111111-1111-1111-1111-111111111111',
  departmentId: '22222222-2222-2222-2222-222222222222',
  priorityId: '33333333-3333-3333-3333-333333333333',
  branchId: '44444444-4444-4444-4444-444444444444',
};

describe('createTicketSchema — channel', () => {
  it('accepts each channel value', () => {
    for (const channel of Object.values(TICKET_CHANNELS)) {
      expect(createTicketSchema.safeParse({ ...validCreateBody, channel }).success).toBe(true);
    }
  });

  it('rejects an unknown channel', () => {
    expect(createTicketSchema.safeParse({ ...validCreateBody, channel: 'SMS' }).success).toBe(false);
  });

  it('accepts the field being absent', () => {
    expect(createTicketSchema.safeParse(validCreateBody).success).toBe(true);
  });
});

describe('listTicketsQuerySchema — channel', () => {
  it('accepts a valid channel filter', () => {
    expect(listTicketsQuerySchema.safeParse({ channel: 'PHONE' }).success).toBe(true);
  });

  it('rejects an unknown channel filter', () => {
    expect(listTicketsQuerySchema.safeParse({ channel: 'SMS' }).success).toBe(false);
  });
});
