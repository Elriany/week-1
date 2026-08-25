import type { RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import type { PermissionCode } from '../../modules/users/permissions.constants';

/**
 * Gates a route on a permission code. Must run after `authenticate`, which
 * populates `req.auth.permissions` from the user's role.
 */
export const authorize = (...required: PermissionCode[]): RequestHandler => (req, _res, next) => {
  if (!req.auth) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const granted = new Set(req.auth.permissions);
  const missing = required.filter(code => !granted.has(code));

  if (missing.length > 0) {
    return next(new ForbiddenError('You do not have permission to perform this action'));
  }

  next();
};
