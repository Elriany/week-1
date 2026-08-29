import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { PERMISSIONS } from '../users/permissions.constants';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/agent', authorize(PERMISSIONS.TICKETS_READ), dashboardController.agent);

export default router;
