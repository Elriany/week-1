import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from './permissions.constants';
import { usersController } from './users.controller';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
  setActiveSchema,
} from './users.schemas';

const router = Router();

// Every route below requires a valid access token.
router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users (scoped to the caller's branch unless Administrator)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Users }
 *       403: { description: Missing users.read }
 */
router.get(
  '/',
  authorize(PERMISSIONS.USERS_READ),
  validate({ query: listUsersQuerySchema }),
  usersController.list,
);

/**
 * @openapi
 * /users/roles:
 *   get:
 *     tags: [Users]
 *     summary: List roles and their permission codes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles }
 */
// Declared before `/:id` so "roles" is not swallowed by the uuid param route.
router.get('/roles', authorize(PERMISSIONS.ROLES_READ), usersController.roles);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Fetch a single user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The user }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  authorize(PERMISSIONS.USERS_READ),
  validate({ params: userIdParamSchema }),
  usersController.getOne,
);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 *       409: { description: Email already registered }
 *       422: { description: Validation failed }
 */
router.post(
  '/',
  authorize(PERMISSIONS.USERS_CREATE),
  validate({ body: createUserSchema }),
  usersController.create,
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's profile, role, branch or department
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 */
router.patch(
  '/:id',
  authorize(PERMISSIONS.USERS_UPDATE),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.update,
);

/**
 * @openapi
 * /users/{id}/active:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Cannot deactivate your own account }
 */
router.patch(
  '/:id/active',
  authorize(PERMISSIONS.USERS_DEACTIVATE),
  validate({ params: userIdParamSchema, body: setActiveSchema }),
  usersController.setActive,
);

export default router;
