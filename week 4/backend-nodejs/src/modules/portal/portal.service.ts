import { AppDataSource } from '../../config/data-source';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { Department } from '../departments/department.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';
import { findById as findCustomerById, toPublicCustomer } from '../customers/customers.service';
import {
  listTickets,
  findById as findTicketById,
  createTicket,
  type ListTicketsFilter,
} from '../tickets/tickets.service';
import { listNotes, createNote } from '../tickets/ticketNotes.service';
import { listAttachments } from '../tickets/ticketAttachments.service';
import { listHistory } from '../tickets/ticketHistory.service';
import { TICKET_CHANNELS } from '../tickets/ticket.constants';

/**
 * Resolves the department a portal-filed ticket lands in. There is no
 * department field on Customers, so the portal picks one deterministically:
 * the branch's SUPPORT department, or failing that its lowest-code active
 * department. A branch with neither is a configuration gap, not a 500.
 */
export async function resolveIntakeDepartment(branchId: string): Promise<Department> {
  const departments = AppDataSource.getRepository(Department);

  const support = await departments.findOne({ where: { branchId, code: 'SUPPORT', isActive: true } });
  if (support) return support;

  const fallback = await departments
    .createQueryBuilder('d')
    .where('d.branchId = :branchId', { branchId })
    .andWhere('d.isActive = :active', { active: true })
    .orderBy('d.code', 'ASC')
    .getOne();
  if (fallback) return fallback;

  throw new ConflictError('No active department is configured for this branch');
}

export async function listMyTickets(customerId: string, filter: ListTicketsFilter) {
  // customerId is applied LAST so a caller-supplied one in `filter` is
  // overwritten — the same guarantee tickets.controller.ts gives branchId.
  return listTickets({ ...filter, customerId });
}

export async function getMyTicket(customerId: string, ticketId: string) {
  const ticket = await findTicketById(ticketId);
  // 404, not 403 — a customer must not be able to probe which ticket numbers exist.
  if (ticket.customerId !== customerId) throw new NotFoundError('Ticket');
  return ticket;
}

export interface CreatePortalTicketInput {
  subject: string;
  description: string;
  categoryId?: string | null;
  priorityCode?: string;
}

export async function createPortalTicket(customerId: string, actorUserId: string, input: CreatePortalTicketInput) {
  const customer = await findCustomerById(customerId);
  if (!customer.isActive) {
    throw new ForbiddenError('This customer account is not active');
  }

  const department = await resolveIntakeDepartment(customer.branchId);

  const priorityCode = input.priorityCode ?? 'MEDIUM';
  const priority = await AppDataSource.getRepository(TicketPriority).findOne({ where: { code: priorityCode } });
  if (!priority) throw new NotFoundError('TicketPriority');

  // createTicket itself writes the TICKET_CREATED audit row — do not write a second one here.
  return createTicket({
    subject: input.subject,
    description: input.description,
    customerId,
    branchId: customer.branchId,
    departmentId: department.id,
    priorityId: priority.id,
    categoryId: input.categoryId ?? null,
    channel: TICKET_CHANNELS.WEB,
    actorUserId,
  });
}

export async function addMyNote(customerId: string, ticketId: string, authorUserId: string, body: string) {
  await getMyTicket(customerId, ticketId);
  // The `false` is hard-coded; no branch of this function can produce an internal note.
  return createNote(ticketId, authorUserId, body, false);
}

export async function listMyTicketChildren(customerId: string, ticketId: string, page: number, pageSize: number) {
  await getMyTicket(customerId, ticketId);
  const [notes, attachments, history] = await Promise.all([
    listNotes(ticketId, false),
    listAttachments(ticketId),
    listHistory(ticketId, page, pageSize, false),
  ]);
  return { notes, attachments, history };
}

export async function getMyProfile(customerId: string) {
  return toPublicCustomer(await findCustomerById(customerId));
}
