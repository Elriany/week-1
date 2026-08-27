import { describe, it, expect } from 'vitest';
import { TICKET_HISTORY_ACTIONS } from '../ticket.constants';

describe('ticket history — unit tests', () => {
  describe('TICKET_HISTORY_ACTIONS', () => {
    it('defines all required history action types', () => {
      expect(TICKET_HISTORY_ACTIONS).toHaveProperty('CREATED');
      expect(TICKET_HISTORY_ACTIONS).toHaveProperty('ASSIGNED');
      expect(TICKET_HISTORY_ACTIONS).toHaveProperty('UNASSIGNED');
      expect(TICKET_HISTORY_ACTIONS).toHaveProperty('STATUS_CHANGED');
      expect(TICKET_HISTORY_ACTIONS).toHaveProperty('PRIORITY_CHANGED');
    });

    it('has exactly five action types', () => {
      expect(Object.keys(TICKET_HISTORY_ACTIONS)).toHaveLength(5);
    });

    it('CREATED action exists for ticket creation auditing', () => {
      expect(TICKET_HISTORY_ACTIONS.CREATED).toBe('CREATED');
    });

    it('ASSIGNED action exists for assignment auditing', () => {
      expect(TICKET_HISTORY_ACTIONS.ASSIGNED).toBe('ASSIGNED');
    });

    it('UNASSIGNED action exists for unassignment auditing', () => {
      expect(TICKET_HISTORY_ACTIONS.UNASSIGNED).toBe('UNASSIGNED');
    });

    it('STATUS_CHANGED action exists for status transition auditing', () => {
      expect(TICKET_HISTORY_ACTIONS.STATUS_CHANGED).toBe('STATUS_CHANGED');
    });

    it('PRIORITY_CHANGED action exists for priority change auditing', () => {
      expect(TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED).toBe('PRIORITY_CHANGED');
    });

    it('action values are uppercase with underscores', () => {
      for (const action of Object.values(TICKET_HISTORY_ACTIONS)) {
        expect(action).toMatch(/^[A-Z_]+$/);
      }
    });
  });

  describe('TicketHistoryAction type', () => {
    it('can be used with assignment from TICKET_HISTORY_ACTIONS', () => {
      const actions = [
        TICKET_HISTORY_ACTIONS.CREATED,
        TICKET_HISTORY_ACTIONS.ASSIGNED,
        TICKET_HISTORY_ACTIONS.UNASSIGNED,
        TICKET_HISTORY_ACTIONS.STATUS_CHANGED,
        TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED,
      ];
      expect(actions).toHaveLength(5);
    });
  });
});
