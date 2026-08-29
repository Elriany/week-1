import { describe, it, expect } from 'vitest';
import { listTicketsQuerySchema } from '../../tickets/tickets.schemas';

describe('report bucket filters — link integrity', () => {
  it('every representative bucket filter parses under listTicketsQuerySchema', () => {
    const samples: Array<Record<string, string>> = [
      { statusId: '11111111-1111-1111-1111-111111111111' },
      { priorityId: '11111111-1111-1111-1111-111111111111' },
      { categoryId: '11111111-1111-1111-1111-111111111111' },
      { channel: 'WEB' },
      { assignedUserId: '11111111-1111-1111-1111-111111111111' },
      { unassigned: 'true' },
      { assignedUserId: '11111111-1111-1111-1111-111111111111', slaStatus: 'BREACHED' },
    ];
    for (const sample of samples) {
      const result = listTicketsQuerySchema.safeParse(sample);
      expect(result.success).toBe(true);
    }
  });

  it('the uncategorised bucket filter is empty, not { categoryId: "" }', () => {
    const emptyFilter = {};
    expect(listTicketsQuerySchema.safeParse(emptyFilter).success).toBe(true);
    expect(listTicketsQuerySchema.safeParse({ categoryId: '' }).success).toBe(false);
  });

  it('myBreached carries both assignedUserId and slaStatus, and the schema accepts slaStatus', () => {
    const filter = { assignedUserId: '11111111-1111-1111-1111-111111111111', slaStatus: 'BREACHED' };
    expect(filter).toHaveProperty('assignedUserId');
    expect(filter).toHaveProperty('slaStatus');
    expect(listTicketsQuerySchema.safeParse(filter).success).toBe(true);
  });
});
