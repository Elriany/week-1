import { describe, it, expect } from 'vitest';
import { passwordSchema, loginSchema, refreshSchema } from '../auth.schemas';

describe('password policy', () => {
  it('accepts a compliant password', () => {
    expect(passwordSchema.safeParse('Passw0rd!').success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('Pw0rd').success).toBe(false);
  });

  it('rejects a password with no uppercase letter', () => {
    expect(passwordSchema.safeParse('passw0rdlong').success).toBe(false);
  });

  it('rejects a password with no digit', () => {
    expect(passwordSchema.safeParse('PasswordOnly').success).toBe(false);
  });

  it('accepts a long non-ASCII password that still meets the policy', () => {
    expect(passwordSchema.safeParse('Aكلمةالمرور1').success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    // Deliberately does NOT apply the password policy — a legacy password must
    // still be able to sign in, and login must not advertise the policy.
    const result = loginSchema.safeParse({ email: 'admin@azm.local', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('refreshSchema', () => {
  it('requires a non-empty refreshToken', () => {
    expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    expect(refreshSchema.safeParse({ refreshToken: 'abc' }).success).toBe(true);
  });
});
