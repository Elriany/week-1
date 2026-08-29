import type { RequestHandler } from 'express';
import { ROLE_CODES } from '../users/permissions.constants';
import {
  totals,
  countByStatus,
  countByPriority,
  countByCategory,
  countByChannel,
  agentWorkload,
  resolutionStats,
  slaBuckets,
  type ReportScope,
} from './reports.service';

function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

export const reportsController = {
  overview: (async (req, res, next) => {
    try {
      const from = req.query.from as Date | undefined;
      const to = req.query.to as Date | undefined;

      const scope: ReportScope = { from, to };
      if (!isUnscoped(req)) {
        // A non-Administrator's supplied branchId is overwritten, not rejected.
        scope.branchId = req.auth!.branchId;
      } else if (req.query.branchId) {
        scope.branchId = req.query.branchId as string;
      }

      const [totalsResult, byStatus, byPriority, byCategory, byChannel, workload, resolution, sla] = await Promise.all([
        totals(scope),
        countByStatus(scope),
        countByPriority(scope),
        countByCategory(scope),
        countByChannel(scope),
        agentWorkload(scope),
        resolutionStats(scope),
        slaBuckets(scope),
      ]);

      return res.json({
        success: true,
        data: {
          range: { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null },
          totals: totalsResult,
          byStatus,
          byPriority,
          byCategory,
          byChannel,
          agentWorkload: workload,
          resolution,
          sla: sla.buckets,
          slaNoPolicyCount: sla.noPolicyCount,
        },
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
