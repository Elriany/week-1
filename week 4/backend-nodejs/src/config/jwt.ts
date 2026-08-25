import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from './env';

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  type: TokenType;
}

function sign(payload: Omit<TokenPayload, 'type'>, type: TokenType, expiresIn: string): string {
  const options = { expiresIn } as SignOptions;
  return jwt.sign({ ...payload, type }, env.JWT_SECRET, options);
}

export function signAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return sign(payload, 'access', env.JWT_ACCESS_EXPIRY);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return sign(payload, 'refresh', env.JWT_REFRESH_EXPIRY);
}

/**
 * Verifies signature and expiry, then asserts the token is of the expected type.
 * Rejecting a refresh token presented as an access token is what stops a long-lived
 * refresh token from being used as a bearer credential against the API.
 * Throws `jsonwebtoken` errors; callers translate them into `UnauthorizedError`.
 */
export function verifyToken(token: string, expectedType: TokenType): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  if (decoded.type !== expectedType) {
    throw new jwt.JsonWebTokenError(`Expected a ${expectedType} token`);
  }
  return decoded;
}
