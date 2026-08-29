import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import * as departmentsService from './departments.service';

function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

/** A non-Administrator may only administer their own branch's departments. */
function requireOwnBranch(req: Parameters<RequestHandler>[0], branchId: string): void {
  if (!isUnscoped(req) && branchId !== req.auth!.branchId) {
    throw new ForbiddenError('You can only administer departments in your own branch');
  }
}

export const departmentsController = {
  list: (async (req, res, next) => {
    try {
      const branchId = isUnscoped(req) ? (req.query.branchId as string | undefined) : req.auth!.branchId;
      const includeInactive = (req.query.includeInactive as boolean | undefined) ?? false;
      const result = await departmentsService.listDepartments({ branchId, includeInactive });
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  create: (async (req, res, next) => {
    try {
      requireOwnBranch(req, req.body.branchId);
      const result = await departmentsService.createDepartment(req.body, req.auth!.userId);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  update: (async (req, res, next) => {
    try {
      const existing = await departmentsService.findById(req.params.id);
      requireOwnBranch(req, existing.branchId);
      const result = await departmentsService.updateDepartment(req.params.id, req.body, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  setActive: (async (req, res, next) => {
    try {
      const existing = await departmentsService.findById(req.params.id);
      requireOwnBranch(req, existing.branchId);
      const result = await departmentsService.setDepartmentActive(req.params.id, req.body.isActive, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
