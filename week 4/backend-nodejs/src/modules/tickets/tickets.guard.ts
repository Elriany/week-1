import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';

/**
 * The staff ticket list is scoped by branch, not by customer, and a CUSTOMER
 * holds `tickets.read` — so the permission check alone would let a signed-in
 * customer read every other customer's tickets in their branch. Until now the
 * only thing standing in the way was a redirect in the frontend router, which
 * a direct API call ignores.
 *
 * The durable fix is a permission code distinct from the portal's, but that
 * changes `permissions.constants.ts` and forces a re-seed. This closes the hole
 * on the server using the role already on `req.auth`, adding no permission.
 * Customers reach their own tickets through `/portal/tickets`.
 */
export const denyCustomerRole: RequestHandler = (req, _res, next) => {
  if (req.auth?.roleCode === ROLE_CODES.CUSTOMER) {
    next(new ForbiddenError('Customers must use the portal endpoints for their own tickets'));
    return;
  }
  next();
};
