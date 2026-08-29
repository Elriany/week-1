import { Router } from 'express';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { departmentsController } from './departments.controller';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentIdParamSchema,
  setActiveSchema,
  listDepartmentsQuerySchema,
} from './departments.schemas';

const router = Router();

router.get(
  '/',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ query: listDepartmentsQuerySchema }),
  departmentsController.list,
);

router.post(
  '/',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ body: createDepartmentSchema }),
  departmentsController.create,
);

router.patch(
  '/:id',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: departmentIdParamSchema, body: updateDepartmentSchema }),
  departmentsController.update,
);

router.patch(
  '/:id/active',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: departmentIdParamSchema, body: setActiveSchema }),
  departmentsController.setActive,
);

export default router;
