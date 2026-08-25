import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, toPublicUser } from '../users.service';
import type { User } from '../user.entity';

describe('password hashing', () => {
  it('produces a bcrypt hash that does not contain the plaintext', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('Passw0rd!');
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(await verifyPassword('Passw0rd!', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(await verifyPassword('Passw0rd?', hash)).toBe(false);
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(await verifyPassword('passw0rd!', hash)).toBe(false);
  });

  it('salts: the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([hashPassword('Passw0rd!'), hashPassword('Passw0rd!')]);
    expect(a).not.toBe(b);
    // Both still verify — the salt travels inside the hash.
    expect(await verifyPassword('Passw0rd!', a)).toBe(true);
    expect(await verifyPassword('Passw0rd!', b)).toBe(true);
  });

  it('round-trips a password containing Arabic characters', async () => {
    const arabic = 'Aكلمةالمرور1';
    const hash = await hashPassword(arabic);
    expect(await verifyPassword(arabic, hash)).toBe(true);
    expect(await verifyPassword('Aكلمةالمرور2', hash)).toBe(false);
  });

  it('returns false rather than throwing on a malformed hash', async () => {
    expect(await verifyPassword('Passw0rd!', 'not-a-bcrypt-hash')).toBe(false);
  });
});

describe('toPublicUser', () => {
  const base = {
    id: 'u-1',
    email: 'admin@azm.local',
    fullNameEn: 'System Administrator',
    fullNameAr: 'مسؤول النظام',
    isActive: true,
    branchId: 'b-1',
    departmentId: 'd-1',
    roleId: 'r-1',
    passwordHash: '$2a$10$averysecrethashvalue',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  } as unknown as User;

  it('never exposes the password hash', () => {
    const output = toPublicUser(base) as unknown as Record<string, unknown>;
    expect(output.passwordHash).toBeUndefined();
    expect(JSON.stringify(output)).not.toContain('averysecrethash');
  });

  it('preserves the Arabic name byte-for-byte', () => {
    expect(toPublicUser(base).fullNameAr).toBe('مسؤول النظام');
  });

  it('omits role when the relation was not loaded', () => {
    expect(toPublicUser(base).role).toBeUndefined();
  });

  it('maps the role when the relation is present', () => {
    const withRole = {
      ...base,
      role: { id: 'r-1', code: 'ADMIN', nameEn: 'Administrator', nameAr: 'المسؤول' },
    } as unknown as User;

    expect(toPublicUser(withRole).role).toEqual({
      id: 'r-1',
      code: 'ADMIN',
      nameEn: 'Administrator',
      nameAr: 'المسؤول',
    });
  });
});
