import type { RequestHandler } from 'express';
import { signAccessToken, signRefreshToken, verifyToken } from '../../config/jwt';
import { UnauthorizedError } from '../../common/errors/AppError';
import { logger } from '../../common/utils/logger';
import {
  findByEmailWithSecret,
  findByIdWithPermissions,
  verifyPassword,
  toPublicUser,
} from '../users/users.service';

/**
 * One message for every failure mode — wrong email, wrong password, deactivated
 * account, missing hash. Distinguishing them would let an attacker enumerate
 * valid accounts.
 */
const INVALID_CREDENTIALS = 'Invalid email or password';

const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await findByEmailWithSecret(email);

    if (!user || !user.isActive || !user.passwordHash) {
      // Still spend time comparing so the response time does not reveal whether
      // the account exists.
      await verifyPassword(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const matches = await verifyPassword(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const claims = { sub: user.id, email: user.email };
    const found = await findByIdWithPermissions(user.id);

    logger.info('User authenticated', { correlationId: req.correlationId, userId: user.id });

    res.json({
      success: true,
      data: {
        accessToken: signAccessToken(claims),
        refreshToken: signRefreshToken(claims),
        user: toPublicUser(user),
        permissions: found?.permissions ?? [],
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
};

const refresh: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    let payload;
    try {
      payload = verifyToken(refreshToken, 'refresh');
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const found = await findByIdWithPermissions(payload.sub);
    if (!found || !found.user.isActive) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const claims = { sub: found.user.id, email: found.user.email };

    res.json({
      success: true,
      data: {
        accessToken: signAccessToken(claims),
        refreshToken: signRefreshToken(claims),
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
};

const me: RequestHandler = async (req, res, next) => {
  try {
    // `authenticate` guarantees req.auth is present on this route.
    const found = await findByIdWithPermissions(req.auth!.userId);
    if (!found) throw new UnauthorizedError('Invalid or expired token');

    res.json({
      success: true,
      data: {
        user: toPublicUser(found.user),
        permissions: found.permissions,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
};

export const authController = { login, refresh, me };
