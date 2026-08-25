import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signAccessToken, signRefreshToken } from '../../../config/jwt';
import { UnauthorizedError } from '../../errors/AppError';

// The middleware re-reads the user on every request; stub that lookup so these
// stay unit tests with no database.
const findByIdWithPermissions = vi.fn();
vi.mock('../../../modules/users/users.service', () => ({
  findByIdWithPermissions: (...args: unknown[]) => findByIdWithPermissions(...args),
}));

const { authenticate } = await import('../authenticate');

const USER_ID = '11111111-1111-1111-1111-111111111111';

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: USER_ID,
      email: 'admin@azm.local',
      isActive: true,
      roleId: 'r-1',
      branchId: 'b-1',
      departmentId: 'd-1',
      role: { code: 'ADMIN' },
      ...overrides,
    },
    permissions: ['users.read'],
  };
}

async function run(authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as any;
  const next = vi.fn();
  // `authenticate` is declared as a RequestHandler (returns void) but its body is
  // async, so await the returned promise to let it settle before asserting.
  await (authenticate(req, {} as any, next) as unknown as Promise<void>);
  return { req, next };
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    findByIdWithPermissions.mockReset();
  });

  it('attaches req.auth for a valid access token', async () => {
    findByIdWithPermissions.mockResolvedValue(activeUser());
    const { req, next } = await run(`Bearer ${signAccessToken({ sub: USER_ID, email: 'admin@azm.local' })}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth.userId).toBe(USER_ID);
    expect(req.auth.roleCode).toBe('ADMIN');
    expect(req.auth.permissions).toEqual(['users.read']);
  });

  it('rejects a request with no Authorization header', async () => {
    const { next } = await run(undefined);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
    expect(findByIdWithPermissions).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer scheme', async () => {
    const { next } = await run('Basic dXNlcjpwYXNz');
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an empty Bearer token', async () => {
    const { next } = await run('Bearer    ');
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a refresh token used as a bearer credential', async () => {
    const { next } = await run(`Bearer ${signRefreshToken({ sub: USER_ID, email: 'admin@azm.local' })}`);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
    expect(findByIdWithPermissions).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user even with a structurally valid token', async () => {
    findByIdWithPermissions.mockResolvedValue(activeUser({ isActive: false }));
    const { next } = await run(`Bearer ${signAccessToken({ sub: USER_ID, email: 'admin@azm.local' })}`);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token whose subject no longer exists', async () => {
    findByIdWithPermissions.mockResolvedValue(null);
    const { next } = await run(`Bearer ${signAccessToken({ sub: USER_ID, email: 'gone@azm.local' })}`);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('does not distinguish expired from malformed in the message', async () => {
    const { next } = await run('Bearer garbage.token.value');
    expect(next.mock.calls[0][0].message).toBe('Invalid or expired token');
  });
});
