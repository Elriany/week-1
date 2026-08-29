import type { RequestHandler } from 'express';
import { ROLE_CODES } from '../users/permissions.constants';
import {
  myOpenCount,
  myBreachedCount,
  unassignedCount,
  branchOpenCount,
  myByStatus,
  myByPriority,
  slaBuckets,
  type ReportScope,
} from './reports.service';

function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

export const dashboardController = {
  agent: (async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const scope: ReportScope = isUnscoped(req) ? {} : { branchId: req.auth!.branchId };

      const [myOpen, myBreached, unassigned, branchOpen, statusBuckets, priorityBuckets, sla] = await Promise.all([
        myOpenCount(scope, userId),
        myBreachedCount(scope, userId),
        unassignedCount(scope),
        branchOpenCount(scope),
        myByStatus(scope, userId),
        myByPriority(scope, userId),
        slaBuckets(scope),
      ]);

      return res.json({
        success: true,
        data: {
          myOpen: { count: myOpen, filter: { assignedUserId: userId } },
          myBreached: { count: myBreached, filter: { assignedUserId: userId, slaStatus: 'BREACHED' } },
          unassigned: { count: unassigned, filter: { unassigned: 'true' } },
          branchOpen: { count: branchOpen, filter: {} },
          myByStatus: statusBuckets,
          myByPriority: priorityBuckets,
          slaBuckets: sla.buckets,
          slaNoPolicyCount: sla.noPolicyCount,
        },
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
