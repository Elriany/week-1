import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { reportsController } from './reports.controller';
import { reportQuerySchema } from './reports.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/overview',
  authorize(PERMISSIONS.REPORTS_READ),
  validate({ query: reportQuerySchema }),
  reportsController.overview,
);

export default router;
