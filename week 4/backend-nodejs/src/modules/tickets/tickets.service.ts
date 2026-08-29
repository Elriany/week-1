import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Ticket } from './ticket.entity';
import { TicketStatus } from './ticketStatus.entity';
import { TicketPriority } from './ticketPriority.entity';
import {
  TICKET_STATUS_CODES,
  canTransition,
  TICKET_HISTORY_ACTIONS,
  DEFAULT_TICKET_CHANNEL,
  type TicketStatusCode,
  type TicketChannel,
} from './ticket.constants';
import { recordHistory } from './ticketHistory.service';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';
import { User } from '../users/user.entity';
import { ROLE_CODES } from '../users/permissions.constants';
import { computeSla, findPolicyByPriorityId, policyMapByPriorityId, type SlaSnapshot } from '../sla/sla.service';
import type { SlaPolicy } from '../sla/slaPolicy.entity';
import { escalateIfBreached } from '../sla/slaEscalation.service';

export interface PublicTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  branchId: string;
  departmentId: string;
  customerId: string;
  assignedUserId: string | null;
  status: { id: string; code: string; nameEn: string; nameAr: string } | null;
  priority: { id: string; code: string; nameEn: string; nameAr: string } | null;
  category: { id: string; code: string; nameEn: string; nameAr: string } | null;
  customer: { id: string; code: string; fullNameEn: string; fullNameAr: string } | null;
  assignedUser: { id: string; fullNameEn: string; fullNameAr: string } | null;
  channel: TicketChannel;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  sla: SlaSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  customerId: string;
  departmentId: string;
  priorityId: string;
  categoryId?: string | null;
  branchId: string;
  channel?: TicketChannel;
  actorUserId: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priorityId?: string;
  categoryId?: string | null;
  departmentId?: string;
}

export interface ListTicketsFilter {
  q?: string;
  branchId?: string;
  departmentId?: string;
  customerId?: string;
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  channel?: TicketChannel;
  /** Computed, not stored — filtering by it reads the whole matching set rather than a page. See listTickets. */
  slaStatus?: SlaSnapshot['status'];
  sortBy?: 'createdAt' | 'updatedAt' | 'ticketNumber' | 'priority';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PagedTickets {
  items: PublicTicket[];
  total: number;
  page: number;
  pageSize: number;
}

export function toPublicTicket(t: Ticket, policy?: SlaPolicy | null): PublicTicket {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    branchId: t.branchId,
    departmentId: t.departmentId,
    customerId: t.customerId,
    assignedUserId: t.assignedUserId ?? null,
    status: t.status
      ? { id: t.status.id, code: t.status.code, nameEn: t.status.nameEn, nameAr: t.status.nameAr }
      : null,
    priority: t.priority
      ? { id: t.priority.id, code: t.priority.code, nameEn: t.priority.nameEn, nameAr: t.priority.nameAr }
      : null,
    category: t.category
      ? { id: t.category.id, code: t.category.code, nameEn: t.category.nameEn, nameAr: t.category.nameAr }
      : null,
    customer: t.customer
      ? { id: t.customer.id, code: t.customer.code, fullNameEn: t.customer.fullNameEn, fullNameAr: t.customer.fullNameAr }
      : null,
    assignedUser: t.assignedUser
      ? { id: t.assignedUser.id, fullNameEn: t.assignedUser.fullNameEn, fullNameAr: t.assignedUser.fullNameAr }
      : null,
    channel: t.channel,
    firstRespondedAt: t.firstRespondedAt ?? null,
    resolvedAt: t.resolvedAt ?? null,
    sla: computeSla(t, policy ?? null),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const tickets = () => AppDataSource.getRepository(Ticket);

const TICKET_PREFIX = 'TKT';

async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${TICKET_PREFIX}-${year}-`;

  const row = await tickets()
    .createQueryBuilder('t')
    .withDeleted()
    .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
    .orderBy('t.ticketNumber', 'DESC')
    .setLock('pessimistic_write')
    .getOne();

  const last = row ? Number.parseInt(row.ticketNumber.slice(prefix.length), 10) : 0;
  const next = Number.isNaN(last) ? 1 : last + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export async function createTicket(input: CreateTicketInput): Promise<PublicTicket> {
  // Use transaction to ensure number generation + insert are atomic
  const savedId = await AppDataSource.transaction(async manager => {
    const year = new Date().getFullYear();
    const prefix = `${TICKET_PREFIX}-${year}-`;

    // Get the highest current number with a lock to prevent race conditions
    const lastTicket = await manager
      .createQueryBuilder(Ticket, 't')
      .withDeleted()
      .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.ticketNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    const last = lastTicket ? Number.parseInt(lastTicket.ticketNumber.slice(prefix.length), 10) : 0;
    const next = Number.isNaN(last) ? 1 : last + 1;
    const ticketNumber = `${prefix}${String(next).padStart(5, '0')}`;

    const newStatus = await manager.findOne(TicketStatus, { where: { code: 'NEW' } });
    if (!newStatus) throw new NotFoundError('TicketStatus (NEW)');

    const ticket = manager.create(Ticket, {
      ticketNumber,
      subject: input.subject,
      description: input.description,
      branchId: input.branchId,
      departmentId: input.departmentId,
      customerId: input.customerId,
      priorityId: input.priorityId,
      categoryId: input.categoryId ?? null,
      statusId: newStatus.id,
      assignedUserId: null,
      channel: input.channel ?? DEFAULT_TICKET_CHANNEL,
    });

    const saved = await manager.save(Ticket, ticket);

    await recordAudit(manager, {
      actorUserId: input.actorUserId,
      action: AUDIT_ACTIONS.TICKET_CREATED,
      entityType: AUDIT_ENTITY_TYPES.TICKET,
      entityId: saved.id,
      summary: `Ticket ${ticketNumber} created`,
      details: { ticketNumber, channel: ticket.channel },
    });

    return saved.id;
  });

  // findById opens its own connection, separate from the transaction's — it
  // must run after the transaction commits, or it deadlocks against the
  // still-uncommitted insert (a pre-existing defect fixed as part of Story 27).
  const created = await findById(savedId);
  return toPublicTicket(created, await findPolicyByPriorityId(created.priorityId));
}

export async function listTickets(filter: ListTicketsFilter = {}): Promise<PagedTickets> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const qb = tickets()
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.status', 'status', 'status.id = t.statusId')
    .leftJoinAndSelect('t.priority', 'priority', 'priority.id = t.priorityId')
    .leftJoinAndSelect('t.category', 'category', 'category.id = t.categoryId')
    .leftJoinAndSelect('t.customer', 'customer', 'customer.id = t.customerId')
    .leftJoinAndSelect('t.assignedUser', 'assignedUser', 'assignedUser.id = t.assignedUserId');

  if (filter.branchId) qb.andWhere('t.branchId = :branchId', { branchId: filter.branchId });
  if (filter.departmentId) qb.andWhere('t.departmentId = :departmentId', { departmentId: filter.departmentId });
  if (filter.customerId) qb.andWhere('t.customerId = :customerId', { customerId: filter.customerId });
  if (filter.statusId) qb.andWhere('t.statusId = :statusId', { statusId: filter.statusId });
  if (filter.priorityId) qb.andWhere('t.priorityId = :priorityId', { priorityId: filter.priorityId });
  if (filter.categoryId) qb.andWhere('t.categoryId = :categoryId', { categoryId: filter.categoryId });
  if (filter.assignedUserId) qb.andWhere('t.assignedUserId = :assignedUserId', { assignedUserId: filter.assignedUserId });
  if (filter.unassigned) qb.andWhere('t.assignedUserId IS NULL');
  if (filter.channel) qb.andWhere('t.channel = :channel', { channel: filter.channel });

  if (filter.q) {
    const term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
    qb.andWhere(
      '(t.ticketNumber LIKE :term OR t.subject LIKE :term OR t.description LIKE :term)',
      { term },
    );
  }

  const SORT_COLUMNS: Record<NonNullable<ListTicketsFilter['sortBy']>, string> = {
    createdAt: 't.createdAt',
    updatedAt: 't.updatedAt',
    ticketNumber: 't.ticketNumber',
    priority: 'priority.sortOrder',
  };
  const column = SORT_COLUMNS[filter.sortBy ?? 'createdAt'];
  const dir = filter.sortDir === 'asc' ? 'ASC' : 'DESC';
  qb.orderBy(column, dir).addOrderBy('t.id', 'ASC');

  const policyMap = await policyMapByPriorityId();

  if (filter.slaStatus) {
    // slaStatus is computed, not indexed, so it cannot be filtered in SQL. This
    // reads the whole branch-scoped matching set rather than a page — the one
    // filter that does, and the one exception to "no counting in JavaScript".
    const rows = await qb.getMany();
    const projected = rows.map(row => toPublicTicket(row, policyMap.get(row.priorityId) ?? null));
    const filtered = projected.filter(p => p.sla?.status === filter.slaStatus);
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
  }

  qb.skip((page - 1) * pageSize).take(pageSize);

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(row => toPublicTicket(row, policyMap.get(row.priorityId) ?? null)), total, page, pageSize };
}

export async function findById(id: string): Promise<Ticket> {
  const ticket = await tickets()
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.status', 'status', 'status.id = t.statusId')
    .leftJoinAndSelect('t.priority', 'priority', 'priority.id = t.priorityId')
    .leftJoinAndSelect('t.category', 'category', 'category.id = t.categoryId')
    .leftJoinAndSelect('t.customer', 'customer', 'customer.id = t.customerId')
    .leftJoinAndSelect('t.assignedUser', 'assignedUser', 'assignedUser.id = t.assignedUserId')
    .where('t.id = :id', { id })
    .getOne();

  if (!ticket) throw new NotFoundError('Ticket');
  return ticket;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<PublicTicket> {
  const ticket = await findById(id);

  // Track priority changes for auditing
  const oldPriorityId = ticket.priorityId;

  Object.assign(ticket, input);

  await AppDataSource.transaction(async manager => {
    await manager.save(ticket);

    // Record priority change in history
    if (input.priorityId && input.priorityId !== oldPriorityId) {
      const oldPriority = ticket.priority;
      const newPriority = await manager.findOne(TicketPriority, {
        where: { id: input.priorityId },
      });

      if (oldPriority && newPriority) {
        await recordHistory(manager, {
          ticketId: id,
          // TODO (Story 27 follow-up): actorUserId is never populated on this path
          actorUserId: '', // Will be set by controller
          action: TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED,
          fromValue: oldPriority.code,
          toValue: newPriority.code,
        });
      }
    }
  });

  const updated = await findById(id);
  return toPublicTicket(updated, await findPolicyByPriorityId(updated.priorityId));
}

/**
 * Transitions a ticket to a new status, enforcing the transition graph.
 * Writes a history row for the transition.
 * Returns 200 silently (no-op) if the ticket is already in the target status.
 * Throws 409 ConflictError if the transition is not allowed.
 * Throws 403 ForbiddenError if the ticket belongs to another branch.
 * Throws 409 ConflictError if the ticket is CLOSED (terminal state).
 */
export async function transitionTicket(
  ticketId: string,
  toStatusId: string,
  actorUserId: string,
  actorBranchId: string,
  note?: string | null,
): Promise<PublicTicket> {
  const ticket = await findById(ticketId);

  // Branch validation
  if (ticket.branchId !== actorBranchId) {
    throw new ForbiddenError('This ticket belongs to another branch');
  }

  // Ensure status relations are loaded
  if (!ticket.status) {
    ticket.status = (await AppDataSource.getRepository(TicketStatus).findOne({ where: { id: ticket.statusId } })) || undefined;
  }

  const toStatus = await AppDataSource.getRepository(TicketStatus).findOne({ where: { id: toStatusId } });
  if (!toStatus) {
    throw new NotFoundError('TicketStatus');
  }

  // Check if already in target status (no-op)
  if (ticket.statusId === toStatusId) {
    return toPublicTicket(ticket, await findPolicyByPriorityId(ticket.priorityId));
  }

  // Check if current status is CLOSED (terminal)
  if (ticket.status!.code === TICKET_STATUS_CODES.CLOSED) {
    throw new ConflictError('Cannot transition a CLOSED ticket');
  }

  // Validate the transition graph
  if (!canTransition(ticket.status!.code as TicketStatusCode, toStatus.code as TicketStatusCode)) {
    throw new ConflictError(`Cannot transition from ${ticket.status!.code} to ${toStatus.code}`);
  }

  // Perform transition in a transaction
  await AppDataSource.transaction(async manager => {
    const oldStatusCode = ticket.status!.code;
    ticket.statusId = toStatusId;

    if (!ticket.resolvedAt &&
        (toStatus.code === TICKET_STATUS_CODES.RESOLVED || toStatus.code === TICKET_STATUS_CODES.CLOSED)) {
      ticket.resolvedAt = new Date();
    }

    await manager.save(ticket);

    await recordHistory(manager, {
      ticketId,
      actorUserId,
      action: TICKET_HISTORY_ACTIONS.STATUS_CHANGED,
      fromValue: oldStatusCode,
      toValue: toStatus.code,
      note: note ?? null,
    });

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
      entityType: AUDIT_ENTITY_TYPES.TICKET,
      entityId: ticketId,
      summary: `${oldStatusCode} → ${toStatus.code}`,
      details: { ticketNumber: ticket.ticketNumber, fromStatus: oldStatusCode, toStatus: toStatus.code, note: note ?? null },
    });

    await escalateIfBreached(manager, ticket, actorUserId);
  });

  const finalTicket = await findById(ticketId);
  return toPublicTicket(finalTicket, await findPolicyByPriorityId(finalTicket.priorityId));
}

/**
 * Assigns or unassigns a ticket to/from a user.
 * When assigning to a NEW ticket, automatically transitions it to ASSIGNED.
 * Validates assignee is active, in the same branch, and not CUSTOMER role.
 * Returns 200 silently (no-op) if the ticket is already assigned to that user or unassignment of an unassigned ticket.
 * Throws 403 ForbiddenError if the ticket belongs to another branch.
 * Throws 409 ConflictError if trying to assign to CUSTOMER or inactive user.
 * Throws 409 ConflictError if trying to reassign a CLOSED ticket.
 */
export async function assignTicket(
  ticketId: string,
  assignedUserId: string | null,
  actorUserId: string,
  actorBranchId: string,
  note?: string | null,
): Promise<PublicTicket> {
  const ticket = await findById(ticketId);

  // Branch validation
  if (ticket.branchId !== actorBranchId) {
    throw new ForbiddenError('This ticket belongs to another branch');
  }

  // Ensure status is loaded
  if (!ticket.status) {
    ticket.status = (await AppDataSource.getRepository(TicketStatus).findOne({ where: { id: ticket.statusId } })) || undefined;
  }

  // Check if CLOSED (terminal)
  if (ticket.status!.code === TICKET_STATUS_CODES.CLOSED) {
    throw new ConflictError('Cannot reassign a CLOSED ticket');
  }

  // Normalize: unassignment is null
  const newAssignedUserId = assignedUserId ?? null;

  // Check if it's already assigned to that user (no-op)
  if (ticket.assignedUserId === newAssignedUserId) {
    return toPublicTicket(ticket, await findPolicyByPriorityId(ticket.priorityId));
  }

  // Validate assignee if assigning
  let assignedUser: User | null = null;
  if (newAssignedUserId) {
    assignedUser = await AppDataSource.getRepository(User).findOne({
      where: { id: newAssignedUserId },
      relations: { role: true },
    });

    if (!assignedUser) {
      throw new NotFoundError('User');
    }

    if (!assignedUser.isActive) {
      throw new ValidationError({ assignedUserId: 'Assignee is not active' });
    }

    if (assignedUser.branchId !== actorBranchId) {
      throw new ValidationError({ assignedUserId: 'Assignee belongs to another branch' });
    }

    if (assignedUser.role?.code === ROLE_CODES.CUSTOMER) {
      throw new ValidationError({ assignedUserId: 'Cannot assign to a CUSTOMER role' });
    }
  }

  // Perform assignment in a transaction
  await AppDataSource.transaction(async manager => {
    const oldAssignedUserId = ticket.assignedUserId;
    const oldAssignedUser = ticket.assignedUser;

    ticket.assignedUserId = newAssignedUserId;

    // First response = the first time a human took ownership. Write-once: a
    // reassignment must not restart the response clock.
    if (newAssignedUserId && !ticket.firstRespondedAt) {
      ticket.firstRespondedAt = new Date();
    }

    // Auto-promote NEW to ASSIGNED when assigning
    let statusChanged = false;
    if (newAssignedUserId && ticket.status!.code === TICKET_STATUS_CODES.NEW) {
      const assignedStatus = await manager.findOne(TicketStatus, {
        where: { code: TICKET_STATUS_CODES.ASSIGNED },
      });
      if (assignedStatus) {
        ticket.statusId = assignedStatus.id;
        ticket.status = assignedStatus;
        statusChanged = true;
      }
    }

    await manager.save(ticket);

    // Record assignment history
    if (newAssignedUserId) {
      const assigneeFullName = assignedUser!.fullNameEn;
      await recordHistory(manager, {
        ticketId,
        actorUserId,
        action: TICKET_HISTORY_ACTIONS.ASSIGNED,
        fromValue: oldAssignedUser?.fullNameEn ?? null,
        toValue: assigneeFullName,
        note: note ?? null,
      });

      await recordAudit(manager, {
        actorUserId,
        action: AUDIT_ACTIONS.TICKET_ASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.TICKET,
        entityId: ticketId,
        summary: `Assigned to ${assigneeFullName}`,
        details: { ticketNumber: ticket.ticketNumber, fromUserId: oldAssignedUserId, toUserId: newAssignedUserId, note: note ?? null },
      });
    } else if (oldAssignedUserId) {
      // Unassignment
      await recordHistory(manager, {
        ticketId,
        actorUserId,
        action: TICKET_HISTORY_ACTIONS.UNASSIGNED,
        fromValue: oldAssignedUser?.fullNameEn ?? null,
        toValue: 'Unassigned',
        note: note ?? null,
      });

      await recordAudit(manager, {
        actorUserId,
        action: AUDIT_ACTIONS.TICKET_UNASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.TICKET,
        entityId: ticketId,
        summary: `Unassigned from ${oldAssignedUser?.fullNameEn ?? 'previous assignee'}`,
        details: { ticketNumber: ticket.ticketNumber, fromUserId: oldAssignedUserId, note: note ?? null },
      });
    }

    // Record status change history if auto-promoted
    if (statusChanged) {
      await recordHistory(manager, {
        ticketId,
        actorUserId,
        action: TICKET_HISTORY_ACTIONS.STATUS_CHANGED,
        fromValue: TICKET_STATUS_CODES.NEW,
        toValue: TICKET_STATUS_CODES.ASSIGNED,
        note: note ?? null,
      });

      await recordAudit(manager, {
        actorUserId,
        action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
        entityType: AUDIT_ENTITY_TYPES.TICKET,
        entityId: ticketId,
        summary: `${TICKET_STATUS_CODES.NEW} → ${TICKET_STATUS_CODES.ASSIGNED}`,
        details: { ticketNumber: ticket.ticketNumber, fromStatus: TICKET_STATUS_CODES.NEW, toStatus: TICKET_STATUS_CODES.ASSIGNED, note: note ?? null },
      });
    }

    await escalateIfBreached(manager, ticket, actorUserId);
  });

  const finalTicket = await findById(ticketId);
  return toPublicTicket(finalTicket, await findPolicyByPriorityId(finalTicket.priorityId));
}
