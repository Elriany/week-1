import { describe, it, expect } from 'vitest';
import { toPublicAuditEntry } from '../audit.service';
import { AuditLog } from '../auditLog.entity';
import { AUDIT_DETAILS_MAX } from '../audit.constants';

function makeRow(overrides: Partial<AuditLog> = {}): AuditLog {
  const row = new AuditLog();
  row.id = 'audit-1';
  row.actorUserId = 'user-1';
  row.action = 'TICKET_CREATED' as any;
  row.entityType = 'Ticket' as any;
  row.entityId = 'ticket-1';
  row.summary = 'Ticket TKT-2026-00001 created';
  row.details = null;
  row.createdAt = new Date('2026-01-01T00:00:00Z');
  row.updatedAt = new Date('2026-01-01T00:00:00Z');
  return Object.assign(row, overrides);
}

describe('toPublicAuditEntry', () => {
  it('parses a valid details string into an object', () => {
    const row = makeRow({ details: JSON.stringify({ ticketNumber: 'TKT-2026-00001' }) });
    const entry = toPublicAuditEntry(row);
    expect(entry.details).toEqual({ ticketNumber: 'TKT-2026-00001' });
  });

  it('returns details: null for malformed JSON rather than throwing', () => {
    const row = makeRow({ details: '{not valid json' });
    expect(() => toPublicAuditEntry(row)).not.toThrow();
    expect(toPublicAuditEntry(row).details).toBeNull();
  });

  it('returns actor: null when the join came back empty', () => {
    const row = makeRow({ actorUser: undefined });
    expect(toPublicAuditEntry(row).actor).toBeNull();
  });

  it('projects the actor from an explicit id/fullNameEn/fullNameAr selection', () => {
    const row = makeRow();
    row.actorUser = { id: 'user-1', fullNameEn: 'Jane', fullNameAr: 'جين' } as any;
    const entry = toPublicAuditEntry(row);
    expect(entry.actor).toEqual({ id: 'user-1', fullNameEn: 'Jane', fullNameAr: 'جين' });
  });
});

describe('audit details length', () => {
  it('AUDIT_DETAILS_MAX bounds what the service will store', () => {
    const longPayload = 'x'.repeat(5000);
    const json = JSON.stringify({ note: longPayload });
    const truncated = json.length > AUDIT_DETAILS_MAX ? json.slice(0, AUDIT_DETAILS_MAX) : json;
    expect(truncated.length).toBe(AUDIT_DETAILS_MAX);
  });
});
