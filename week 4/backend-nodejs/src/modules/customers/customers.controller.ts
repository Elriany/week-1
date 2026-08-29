import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  setCustomerActive,
  softDeleteCustomer,
  findById,
  toPublicCustomer,
  type ListCustomersFilter,
} from './customers.service';

function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

export const customersController = {
  list: (async (req, res, next) => {
    try {
      let filter: ListCustomersFilter = {
        q: req.query.q as string | undefined,
        branchId: req.query.branchId as string | undefined,
        isActive: req.query.isActive as boolean | undefined,
        page: req.query.page as number | undefined,
        pageSize: req.query.pageSize as number | undefined,
      };

      if (!isUnscoped(req)) {
        filter.branchId = req.auth!.branchId;
      }

      const result = await listCustomers(filter);
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
      const customer = await findById(req.params.id);

      if (!isUnscoped(req) && customer.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This customer belongs to another branch');
      }

      return res.json({
        success: true,
        data: toPublicCustomer(customer),
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  create: (async (req, res, next) => {
    try {
      if (!isUnscoped(req) && req.body.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('You can only create customers in your own branch');
      }

      const result = await createCustomer(req.body);
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
      const customer = await findById(req.params.id);

      if (!isUnscoped(req) && customer.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This customer belongs to another branch');
      }

      const result = await updateCustomer(req.params.id, req.body);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  setActive: (async (req, res, next) => {
    try {
      const customer = await findById(req.params.id);

      if (!isUnscoped(req) && customer.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This customer belongs to another branch');
      }

      const result = await setCustomerActive(req.params.id, req.body.isActive);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  remove: (async (req, res, next) => {
    try {
      const customer = await findById(req.params.id);

      if (!isUnscoped(req) && customer.branchId !== req.auth!.branchId) {
        throw new ForbiddenError('This customer belongs to another branch');
      }

      await softDeleteCustomer(req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
