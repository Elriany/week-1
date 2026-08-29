import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';

/**
 * Resolves the Customers row this request acts for. The link — not the role —
 * is the test: an account with no customerId cannot reach the portal at all.
 * Fails closed with 403; it must NEVER return null or fall back to an
 * unscoped read.
 */
export function requirePortalCustomerId(req: Parameters<RequestHandler>[0]): string {
  const customerId = req.auth?.customerId ?? null;
  if (!customerId) {
    throw new ForbiddenError('This account is not linked to a customer record');
  }
  return customerId;
}
