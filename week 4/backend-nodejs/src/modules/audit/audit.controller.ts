import type { RequestHandler } from 'express';
import { listAudit } from '../../common/audit/audit.service';

export const auditController = {
  list: (async (req, res, next) => {
    try {
      const result = await listAudit({
        entityType: req.query.entityType as any,
        entityId: req.query.entityId as string | undefined,
        actorUserId: req.query.actorUserId as string | undefined,
        action: req.query.action as any,
        from: req.query.from as Date | undefined,
        to: req.query.to as Date | undefined,
        page: req.query.page as number | undefined,
        pageSize: req.query.pageSize as number | undefined,
      });
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
