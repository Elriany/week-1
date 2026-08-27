import { describe, it, expect } from 'vitest';
import { TICKET_STATUS_CODES, TICKET_TRANSITIONS, canTransition } from '../ticket.constants';

describe('ticket transitions — unit tests', () => {
  describe('TICKET_TRANSITIONS graph', () => {
    it('defines transitions for all six statuses', () => {
      const statusCodes = Object.values(TICKET_STATUS_CODES);
      for (const code of statusCodes) {
        expect(TICKET_TRANSITIONS).toHaveProperty(code);
      }
    });

    it('NEW can transition to ASSIGNED, IN_PROGRESS, or CLOSED', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.NEW];
      expect(allowed).toContain(TICKET_STATUS_CODES.ASSIGNED);
      expect(allowed).toContain(TICKET_STATUS_CODES.IN_PROGRESS);
      expect(allowed).toContain(TICKET_STATUS_CODES.CLOSED);
      expect(allowed).toHaveLength(3);
    });

    it('ASSIGNED can transition to IN_PROGRESS, PENDING_CUSTOMER, RESOLVED, or CLOSED', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.ASSIGNED];
      expect(allowed).toContain(TICKET_STATUS_CODES.IN_PROGRESS);
      expect(allowed).toContain(TICKET_STATUS_CODES.PENDING_CUSTOMER);
      expect(allowed).toContain(TICKET_STATUS_CODES.RESOLVED);
      expect(allowed).toContain(TICKET_STATUS_CODES.CLOSED);
      expect(allowed).toHaveLength(4);
    });

    it('IN_PROGRESS can transition to ASSIGNED, PENDING_CUSTOMER, RESOLVED, or CLOSED', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.IN_PROGRESS];
      expect(allowed).toContain(TICKET_STATUS_CODES.ASSIGNED);
      expect(allowed).toContain(TICKET_STATUS_CODES.PENDING_CUSTOMER);
      expect(allowed).toContain(TICKET_STATUS_CODES.RESOLVED);
      expect(allowed).toContain(TICKET_STATUS_CODES.CLOSED);
      expect(allowed).toHaveLength(4);
    });

    it('PENDING_CUSTOMER can transition to IN_PROGRESS, RESOLVED, or CLOSED', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.PENDING_CUSTOMER];
      expect(allowed).toContain(TICKET_STATUS_CODES.IN_PROGRESS);
      expect(allowed).toContain(TICKET_STATUS_CODES.RESOLVED);
      expect(allowed).toContain(TICKET_STATUS_CODES.CLOSED);
      expect(allowed).toHaveLength(3);
    });

    it('RESOLVED can only transition to CLOSED', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.RESOLVED];
      expect(allowed).toEqual([TICKET_STATUS_CODES.CLOSED]);
      expect(allowed).toHaveLength(1);
    });

    it('CLOSED is terminal (no outgoing transitions)', () => {
      const allowed = TICKET_TRANSITIONS[TICKET_STATUS_CODES.CLOSED];
      expect(allowed).toHaveLength(0);
    });
  });

  describe('canTransition helper', () => {
    it('returns true for valid transitions', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.ASSIGNED)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.ASSIGNED, TICKET_STATUS_CODES.IN_PROGRESS)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.RESOLVED, TICKET_STATUS_CODES.CLOSED)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.PENDING_CUSTOMER)).toBe(false);
      expect(canTransition(TICKET_STATUS_CODES.RESOLVED, TICKET_STATUS_CODES.ASSIGNED)).toBe(false);
      expect(canTransition(TICKET_STATUS_CODES.CLOSED, TICKET_STATUS_CODES.NEW)).toBe(false);
    });

    it('returns false for same status (no self-loops)', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.NEW)).toBe(false);
      expect(canTransition(TICKET_STATUS_CODES.ASSIGNED, TICKET_STATUS_CODES.ASSIGNED)).toBe(false);
    });

    it('handles CLOSED as terminal', () => {
      // CLOSED cannot transition to any status
      for (const status of Object.values(TICKET_STATUS_CODES)) {
        if (status !== TICKET_STATUS_CODES.CLOSED) {
          expect(canTransition(TICKET_STATUS_CODES.CLOSED, status)).toBe(false);
        }
      }
    });
  });

  describe('transition paths', () => {
    it('allows path NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.ASSIGNED)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.ASSIGNED, TICKET_STATUS_CODES.IN_PROGRESS)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.IN_PROGRESS, TICKET_STATUS_CODES.RESOLVED)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.RESOLVED, TICKET_STATUS_CODES.CLOSED)).toBe(true);
    });

    it('allows path NEW → ASSIGNED → PENDING_CUSTOMER → RESOLVED → CLOSED', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.ASSIGNED)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.ASSIGNED, TICKET_STATUS_CODES.PENDING_CUSTOMER)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.PENDING_CUSTOMER, TICKET_STATUS_CODES.RESOLVED)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.RESOLVED, TICKET_STATUS_CODES.CLOSED)).toBe(true);
    });

    it('allows path NEW → IN_PROGRESS → CLOSED (skip ASSIGNED)', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.IN_PROGRESS)).toBe(true);
      expect(canTransition(TICKET_STATUS_CODES.IN_PROGRESS, TICKET_STATUS_CODES.CLOSED)).toBe(true);
    });

    it('prevents path NEW → RESOLVED (must go through intermediate states)', () => {
      expect(canTransition(TICKET_STATUS_CODES.NEW, TICKET_STATUS_CODES.RESOLVED)).toBe(false);
    });
  });
});
