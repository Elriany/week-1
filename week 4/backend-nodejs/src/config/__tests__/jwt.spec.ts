import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyToken } from '../jwt';

const claims = { sub: '11111111-1111-1111-1111-111111111111', email: 'admin@azm.local' };

describe('jwt', () => {
  it('signs and verifies an access token', () => {
    const payload = verifyToken(signAccessToken(claims), 'access');
    expect(payload.sub).toBe(claims.sub);
    expect(payload.email).toBe(claims.email);
    expect(payload.type).toBe('access');
  });

  it('signs and verifies a refresh token', () => {
    const payload = verifyToken(signRefreshToken(claims), 'refresh');
    expect(payload.type).toBe('refresh');
  });

  it('rejects a refresh token presented as an access token', () => {
    const refresh = signRefreshToken(claims);
    expect(() => verifyToken(refresh, 'access')).toThrow();
  });

  it('rejects an access token presented as a refresh token', () => {
    const access = signAccessToken(claims);
    expect(() => verifyToken(access, 'refresh')).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ ...claims, type: 'access' }, 'a-completely-different-secret');
    expect(() => verifyToken(forged, 'access')).toThrow();
  });

  it('rejects a malformed token', () => {
    expect(() => verifyToken('not-a-jwt', 'access')).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { ...claims, type: 'access' },
      process.env.JWT_SECRET as string,
      { expiresIn: '-1s' },
    );
    expect(() => verifyToken(expired, 'access')).toThrow();
  });
});
