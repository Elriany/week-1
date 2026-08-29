import type { RequestHandler } from 'express';
import { listPolicies, upsertPolicy } from './sla.service';

export const slaController = {
  listPolicies: (async (req, res, next) => {
    try {
      const result = await listPolicies();
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  upsertPolicy: (async (req, res, next) => {
    try {
      const result = await upsertPolicy(req.params.priorityId, req.body, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
