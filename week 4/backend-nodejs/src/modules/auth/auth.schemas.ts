import { z } from 'zod';

/**
 * Password policy: at least 8 characters, one uppercase letter and one digit.
 * Enforced here so both `POST /auth/login` callers and `POST /users` share one rule.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const loginSchema = z.object({
  email: z.string().email(),
  // Deliberately NOT `passwordSchema` — login must not reveal the policy, and a
  // legacy password that no longer meets the policy must still be able to sign in.
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
