import type { RequestHandler } from 'express';
import { verifyToken } from '../../config/jwt';
import { UnauthorizedError } from '../errors/AppError';
import { findByIdWithPermissions } from '../../modules/users/users.service';

/**
 * Validates the Bearer access token and attaches `req.auth`.
 *
 * The user record is re-read on every request rather than trusted from the token
 * claims. That costs one indexed lookup but makes deactivation take effect
 * immediately instead of lingering until the token expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedError('Missing bearer token');

    let payload;
    try {
      payload = verifyToken(token, 'access');
    } catch {
      // Do not surface the underlying jsonwebtoken message — it distinguishes
      // "expired" from "malformed" from "bad signature", which is more than a
      // caller needs and more than we want to tell an attacker.
      throw new UnauthorizedError('Invalid or expired token');
    }

    const found = await findByIdWithPermissions(payload.sub);
    if (!found || !found.user.isActive) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.auth = {
      userId: found.user.id,
      email: found.user.email,
      roleId: found.user.roleId,
      roleCode: found.user.role?.code ?? '',
      branchId: found.user.branchId,
      departmentId: found.user.departmentId,
      permissions: found.permissions,
    };

    next();
  } catch (err) {
    next(err);
  }
};
