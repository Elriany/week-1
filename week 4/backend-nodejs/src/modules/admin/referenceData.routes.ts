import { Router } from 'express';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { referenceDataController } from './referenceData.controller';
import {
  referenceKindParamSchema,
  referenceIdParamSchema,
  createReferenceSchema,
  updateReferenceSchema,
  setActiveSchema,
  listReferenceQuerySchema,
} from './referenceData.schemas';

const router = Router();

router.get(
  '/:kind',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: referenceKindParamSchema, query: listReferenceQuerySchema }),
  referenceDataController.list,
);

router.post(
  '/:kind',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: referenceKindParamSchema, body: createReferenceSchema }),
  referenceDataController.create,
);

router.patch(
  '/:kind/:id',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: referenceIdParamSchema, body: updateReferenceSchema }),
  referenceDataController.update,
);

router.patch(
  '/:kind/:id/active',
  authorize(PERMISSIONS.ADMIN_MANAGE),
  validate({ params: referenceIdParamSchema, body: setActiveSchema }),
  referenceDataController.setActive,
);

export default router;
