import type { RequestHandler } from 'express';
import * as referenceDataService from './referenceData.service';
import type { ReferenceKind } from './referenceData.service';

export const referenceDataController = {
  list: (async (req, res, next) => {
    try {
      const kind = req.params.kind as ReferenceKind;
      const includeInactive = (req.query.includeInactive as boolean | undefined) ?? false;
      const result = await referenceDataService.listReference(kind, includeInactive);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  create: (async (req, res, next) => {
    try {
      const kind = req.params.kind as ReferenceKind;
      const result = await referenceDataService.createReference(kind, req.body, req.auth!.userId);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  update: (async (req, res, next) => {
    try {
      const kind = req.params.kind as ReferenceKind;
      const result = await referenceDataService.updateReference(kind, req.params.id, req.body, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  setActive: (async (req, res, next) => {
    try {
      const kind = req.params.kind as ReferenceKind;
      const result = await referenceDataService.setReferenceActive(kind, req.params.id, req.body.isActive, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
