import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';

/**
 * A second gate on top of `admin.manage`: branch create/update is
 * Administrator-role only, even though Managers also hold `admin.manage`.
 * The permission is the first gate; the role is the second.
 */
export function requireAdministrator(req: Parameters<RequestHandler>[0]): void {
  if (req.auth?.roleCode !== ROLE_CODES.ADMIN) {
    throw new ForbiddenError('This action requires the Administrator role');
  }
}
