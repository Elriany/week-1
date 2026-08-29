import { EntityManager } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';
import { TicketStatus } from '../tickets/ticketStatus.entity';
import { TICKET_STATUS_CODES, TICKET_HISTORY_ACTIONS } from '../tickets/ticket.constants';
import { recordHistory } from '../tickets/ticketHistory.service';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';
import { computeSla } from './sla.service';
import { SlaPolicy } from './slaPolicy.entity';

/**
 * Rule-based, in-process escalation. Runs on the next write to a ticket — there
 * is no scheduler and no external notifier by design. The audit row and the
 * TicketHistory row ARE the notification.
 *
 * Bounded by the four seeded priority rows: each escalation is a real priority
 * change, so a subsequent write recomputes against the new (shorter) target and
 * may escalate again, but only until the top priority.
 */
export async function escalateIfBreached(
  manager: EntityManager,
  ticket: Ticket,
  actorUserId: string,
): Promise<boolean> {
  const policy = await manager.findOne(SlaPolicy, { where: { priorityId: ticket.priorityId } });
  if (!policy || !policy.isActive) return false;

  const snapshot = computeSla(ticket, policy);
  if (!snapshot || snapshot.status !== 'BREACHED') return false;

  const status = await manager.findOne(TicketStatus, { where: { id: ticket.statusId } });
  if (status?.code === TICKET_STATUS_CODES.RESOLVED || status?.code === TICKET_STATUS_CODES.CLOSED) {
    return false;
  }

  const currentPriority = await manager.findOne(TicketPriority, { where: { id: ticket.priorityId } });
  if (!currentPriority) return false;

  const nextPriority = await manager
    .createQueryBuilder(TicketPriority, 'p')
    .where('p.sortOrder > :sortOrder', { sortOrder: currentPriority.sortOrder })
    .orderBy('p.sortOrder', 'ASC')
    .getOne();

  if (!nextPriority) return false; // already at the top priority

  const oldPriorityCode = currentPriority.code;
  ticket.priorityId = nextPriority.id;
  // A targeted column update, not a full-entity `.save()` — the ticket object
  // was already saved once earlier in the same transaction (for the
  // assignment or transition that triggered this), and a second full save of
  // the same tracked entity has been observed to silently drop this column
  // from its diff. `.update()` is unambiguous: it writes exactly this column.
  await manager.update(Ticket, ticket.id, { priorityId: nextPriority.id });

  await recordHistory(manager, {
    ticketId: ticket.id,
    actorUserId,
    action: TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED,
    fromValue: oldPriorityCode,
    toValue: nextPriority.code,
    note: 'SLA breach escalation',
  });

  await recordAudit(manager, {
    actorUserId,
    action: AUDIT_ACTIONS.TICKET_PRIORITY_CHANGED,
    entityType: AUDIT_ENTITY_TYPES.TICKET,
    entityId: ticket.id,
    summary: `${oldPriorityCode} → ${nextPriority.code} (SLA breach escalation)`,
    details: { ticketNumber: ticket.ticketNumber, fromPriority: oldPriorityCode, toPriority: nextPriority.code, note: 'SLA breach escalation' },
  });

  return true;
}
