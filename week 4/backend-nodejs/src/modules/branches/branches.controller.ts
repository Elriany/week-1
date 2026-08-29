import type { RequestHandler } from 'express';
import { requireAdministrator } from '../admin/admin.guard';
import * as branchesService from './branches.service';

export const branchesController = {
  list: (async (req, res, next) => {
    try {
      const includeInactive = (req.query.includeInactive as boolean | undefined) === true;
      const result = await branchesService.listBranches(includeInactive);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  create: (async (req, res, next) => {
    try {
      requireAdministrator(req);
      const result = await branchesService.createBranch(req.body, req.auth!.userId);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  update: (async (req, res, next) => {
    try {
      requireAdministrator(req);
      const result = await branchesService.updateBranch(req.params.id, req.body, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  setActive: (async (req, res, next) => {
    try {
      requireAdministrator(req);
      const result = await branchesService.setBranchActive(req.params.id, req.body.isActive, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
