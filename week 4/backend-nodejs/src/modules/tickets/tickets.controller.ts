import type { RequestHandler } from 'express';
import { ForbiddenError, ValidationError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import { AppDataSource } from '../../config/data-source';
import { TicketStatus } from './ticketStatus.entity';
import { TicketPriority } from './ticketPriority.entity';
import { TicketCategory } from './ticketCategory.entity';
import { User } from '../users/user.entity';
import {
  listTickets,
  createTicket,
  updateTicket,
  findById,
  toPublicTicket,
  type ListTicketsFilter,
  transitionTicket,
  assignTicket,
} from './tickets.service';
import { findById as findCustomerById } from '../customers/customers.service';
import { listHistory } from './ticketHistory.service';

function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

/**
 * Exported helper to validate ticket belongs to user's branch.
 * Use in any middleware/controller that needs to check ticket scope.
 */
export async function requireTicketInScope(ticketId: string, branchId: string): Promise<void> {
  const ticket = await findById(ticketId);
  if (ticket.branchId !== branchId) {
    throw new ForbiddenError('This ticket belongs to another branch');
  }
}

export const ticketsController = {
  list: (async (req, res, next) => {
    try {
      let filter: ListTicketsFilter = {
        q: req.query.q as string | undefined,
        branchId: req.query.branchId as string | undefined,
        departmentId: req.query.departmentId as string | undefined,
        customerId: req.query.customerId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        priorityId: req.query.priorityId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        assignedUserId: req.query.assignedUserId as string | undefined,
        unassigned: req.query.unassigned as boolean | undefined,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
        page: req.query.page as number | undefined,
        pageSize: req.query.pageSize as number | undefined,
      };

      if (!isUnscoped(req)) {
        filter.branchId = req.auth!.branchId;
      }

      const result = await listTickets(filter);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  getOne: (async (req, res, next) => {
    try {
      const ticket = await findById(req.params.id);

      if (!isUnscoped(req) && ticket.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This ticket belongs to another branch');
      }

      return res.json({
        success: true,
        data: toPublicTicket(ticket),
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  create: (async (req, res, next) => {
    try {
      if (!isUnscoped(req) && req.body.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('You can only create tickets in your own branch');
      }

      // Validate customer is in the same branch
      const customer = await findCustomerById(req.body.customerId);
      if (customer.branchId !== req.body.branchId) {
        throw new ValidationError({ customerId: 'Customer belongs to another branch' });
      }

      const result = await createTicket(req.body);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  update: (async (req, res, next) => {
    try {
      const ticket = await findById(req.params.id);

      if (!isUnscoped(req) && ticket.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This ticket belongs to another branch');
      }

      const result = await updateTicket(req.params.id, req.body);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  meta: (async (req, res, next) => {
    try {
      const [statuses, priorities, categories] = await Promise.all([
        AppDataSource.getRepository(TicketStatus).find({ order: { sortOrder: 'ASC' } }),
        AppDataSource.getRepository(TicketPriority).find({ order: { sortOrder: 'ASC' } }),
        AppDataSource.getRepository(TicketCategory).find({ order: { sortOrder: 'ASC' } }),
      ]);
      return res.json({
        success: true,
        data: { statuses, priorities, categories },
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  transition: (async (req, res, next) => {
    try {
      const ticket = await findById(req.params.id);

      if (!isUnscoped(req) && ticket.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This ticket belongs to another branch');
      }

      const result = await transitionTicket(
        req.params.id,
        req.body.statusId,
        req.auth!.userId,
        req.auth!.branchId,
        req.body.note,
      );

      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  assign: (async (req, res, next) => {
    try {
      const ticket = await findById(req.params.id);

      if (!isUnscoped(req) && ticket.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This ticket belongs to another branch');
      }

      const result = await assignTicket(
        req.params.id,
        req.body.assignedUserId,
        req.auth!.userId,
        req.auth!.branchId,
        req.body.note,
      );

      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  history: (async (req, res, next) => {
    try {
      const ticket = await findById(req.params.id);

      if (!isUnscoped(req) && ticket.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This ticket belongs to another branch');
      }

      const page = Math.max(1, req.query.page as number | undefined ?? 1);
      const pageSize = Math.min(100, Math.max(1, (req.query.pageSize as number | undefined) ?? 20));
      const includeInternal = req.auth?.roleCode !== ROLE_CODES.CUSTOMER;

      const result = await listHistory(req.params.id, page, pageSize, includeInternal);

      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  assignableUsers: (async (req, res, next) => {
    try {
      const query = AppDataSource.getRepository(User)
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.role', 'role')
        .where('u.isActive = :active', { active: true })
        .andWhere('role.code != :customerRole', { customerRole: ROLE_CODES.CUSTOMER })
        .orderBy('u.fullNameEn', 'ASC');

      if (!isUnscoped(req)) {
        query.andWhere('u.branchId = :branchId', { branchId: req.auth!.branchId });
      }

      const users = await query.getMany();

      const projected = users.map(u => ({
        id: u.id,
        fullNameEn: u.fullNameEn,
        fullNameAr: u.fullNameAr,
        roleCode: u.role?.code,
      }));

      return res.json({
        success: true,
        data: projected,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
