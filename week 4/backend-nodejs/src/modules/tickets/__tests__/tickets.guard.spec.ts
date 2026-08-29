import { describe, it, expect, vi } from 'vitest';
import { denyCustomerRole } from '../tickets.guard';
import { ForbiddenError } from '../../../common/errors/AppError';
import { ROLE_CODES } from '../../users/permissions.constants';

function run(roleCode?: string) {
  const req = { auth: roleCode ? { roleCode } : undefined } as never;
  const next = vi.fn();
  (denyCustomerRole as (r: unknown, s: unknown, n: unknown) => void)(req, {}, next);
  return next;
}

describe('denyCustomerRole', () => {
  // A CUSTOMER holds tickets.read, and the staff list is scoped by branch, not
  // by customer — so without this a customer could read other customers'
  // tickets in their branch straight from the API.
  it('rejects a CUSTOMER with ForbiddenError', () => {
    const next = run(ROLE_CODES.CUSTOMER);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(ForbiddenError);
  });

  it.each([ROLE_CODES.ADMIN, ROLE_CODES.MANAGER, ROLE_CODES.SUPERVISOR, ROLE_CODES.AGENT])(
    'lets %s through',
    (roleCode) => {
      const next = run(roleCode);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0]![0]).toBeUndefined();
    },
  );

  // `authenticate` runs first, so an absent auth context means a public route;
  // this guard is not the thing that should reject it.
  it('passes through when there is no auth context', () => {
    const next = run(undefined);

    expect(next.mock.calls[0]![0]).toBeUndefined();
  });
});
