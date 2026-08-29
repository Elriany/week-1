import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { slaController } from './sla.controller';
import { priorityIdParamSchema, upsertSlaPolicySchema } from './sla.schemas';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/sla/policies:
 *   get:
 *     tags: [SLA]
 *     operationId: listSlaPolicies
 *     summary: List SLA policies, one per priority
 *     responses:
 *       200:
 *         description: Policies listed successfully
 */
router.get('/policies', authorize(PERMISSIONS.TICKETS_READ), slaController.listPolicies);

/**
 * @openapi
 * /api/v1/sla/policies/{priorityId}:
 *   put:
 *     tags: [SLA]
 *     operationId: upsertSlaPolicy
 *     summary: Create or update the SLA policy for a priority
 *     parameters:
 *       - in: path
 *         name: priorityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {}
 *     responses:
 *       200:
 *         description: Policy upserted successfully
 */
router.put(
  '/policies/:priorityId',
  authorize(PERMISSIONS.SLA_MANAGE),
  validate({ params: priorityIdParamSchema, body: upsertSlaPolicySchema }),
  slaController.upsertPolicy,
);

export default router;
