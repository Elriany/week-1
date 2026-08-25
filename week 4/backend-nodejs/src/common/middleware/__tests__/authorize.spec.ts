import { describe, it, expect, vi } from 'vitest';
import { authorize } from '../authorize';
import { UnauthorizedError, ForbiddenError } from '../../errors/AppError';
import { PERMISSIONS } from '../../../modules/users/permissions.constants';

function makeReq(permissions?: string[]) {
  return permissions === undefined
    ? ({ } as any)
    : ({ auth: { permissions } } as any);
}

describe('authorize middleware', () => {
  it('calls next with no argument when the permission is held', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.USERS_READ)(makeReq([PERMISSIONS.USERS_READ]), {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('forwards ForbiddenError when the permission is missing', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.USERS_CREATE)(makeReq([PERMISSIONS.USERS_READ]), {} as any, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('forwards UnauthorizedError when authenticate did not run', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.USERS_READ)(makeReq(undefined), {} as any, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('requires every permission when several are given', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_CREATE)(
      makeReq([PERMISSIONS.USERS_READ]),
      {} as any,
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('denies a user with an empty permission set', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.TICKETS_READ)(makeReq([]), {} as any, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('does not leak which permission was missing', () => {
    const next = vi.fn();
    authorize(PERMISSIONS.USERS_DEACTIVATE)(makeReq([]), {} as any, next);

    expect(next.mock.calls[0][0].message).not.toContain(PERMISSIONS.USERS_DEACTIVATE);
  });
});
