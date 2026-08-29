import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from './permissions.constants';
import {
  listUsers,
  createUser,
  updateUser,
  setUserActive,
  findById,
  toPublicUser,
  listRoles,
  linkCustomer,
  type ListUsersFilter,
} from './users.service';

/**
 * Administrators operate across every branch. Every other role is confined to the
 * branch on their own user record, so a Manager in Riyadh cannot read or create
 * users in Headquarters.
 */
function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}

const list: RequestHandler = async (req, res, next) => {
  try {
    const filter = { ...(req.query as ListUsersFilter) };

    if (!isUnscoped(req)) {
      // Override rather than reject: a caller may omit the filter entirely.
      filter.branchId = req.auth!.branchId;
    }

    const data = await listUsers(filter);
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const getOne: RequestHandler = async (req, res, next) => {
  try {
    const user = await findById(req.params.id);

    if (!isUnscoped(req) && user.branchId !== req.auth!.branchId) {
      throw new ForbiddenError('This user belongs to another branch');
    }

    res.json({ success: true, data: toPublicUser(user), correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const create: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as Parameters<typeof createUser>[0];

    if (!isUnscoped(req) && body.branchId !== req.auth!.branchId) {
      throw new ForbiddenError('You can only create users in your own branch');
    }

    const data = await createUser(body);
    res.status(201).json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const update: RequestHandler = async (req, res, next) => {
  try {
    const existing = await findById(req.params.id);

    if (!isUnscoped(req) && existing.branchId !== req.auth!.branchId) {
      throw new ForbiddenError('This user belongs to another branch');
    }

    const data = await updateUser(req.params.id, req.body);
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const setActive: RequestHandler = async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive: boolean };
    const existing = await findById(req.params.id);

    if (!isUnscoped(req) && existing.branchId !== req.auth!.branchId) {
      throw new ForbiddenError('This user belongs to another branch');
    }

    // Locking yourself out of the system is never the intent.
    if (existing.id === req.auth!.userId && !isActive) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const data = await setUserActive(req.params.id, isActive);
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const roles: RequestHandler = async (req, res, next) => {
  try {
    const data = (await listRoles()).map(role => ({
      id: role.id,
      code: role.code,
      nameEn: role.nameEn,
      nameAr: role.nameAr,
      permissions: (role.permissions ?? []).map(p => p.code),
    }));
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

const linkCustomerHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = await linkCustomer(req.params.id, req.body.customerId, req.auth!.userId);
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

export const usersController = { list, getOne, create, update, setActive, roles, linkCustomer: linkCustomerHandler };
