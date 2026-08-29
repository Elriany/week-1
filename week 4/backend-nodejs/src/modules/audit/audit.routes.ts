import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { auditController } from './audit.controller';
import { auditQuerySchema } from '../reports/reports.schemas';

const router = Router();

router.use(authenticate);

// Audit rows are not branch-scoped: the table has no branch column, and
// audit.read is held only by Administrator and Manager — deliberate, not an
// oversight.
router.get(
  '/',
  authorize(PERMISSIONS.AUDIT_READ),
  validate({ query: auditQuerySchema }),
  auditController.list,
);

export default router;
