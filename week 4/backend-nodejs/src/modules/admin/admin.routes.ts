import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import branchesRoutes from '../branches/branches.routes';
import departmentsRoutes from '../departments/departments.routes';
import referenceDataRoutes from './referenceData.routes';

const router = Router();

router.use(authenticate);

router.use('/branches', branchesRoutes);
router.use('/departments', departmentsRoutes);
router.use('/reference', referenceDataRoutes);

export default router;
