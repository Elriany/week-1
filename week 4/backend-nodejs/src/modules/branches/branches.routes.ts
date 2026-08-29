import { Router } from 'express';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { branchesController } from './branches.controller';
import { createBranchSchema, updateBranchSchema, branchIdParamSchema, setActiveSchema, listBranchesQuerySchema } from './branches.schemas';

const router = Router();

router.get(
  '/',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ query: listBranchesQuerySchema }),
  branchesController.list,
);

// The Administrator-role check runs inside the controller, on top of this
// permission gate — Managers hold admin.manage too but may not create branches.
router.post(
  '/',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ body: createBranchSchema }),
  branchesController.create,
);

router.patch(
  '/:id',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: branchIdParamSchema, body: updateBranchSchema }),
  branchesController.update,
);

router.patch(
  '/:id/active',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: branchIdParamSchema, body: setActiveSchema }),
  branchesController.setActive,
);

export default router;
