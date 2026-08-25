import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  PERMISSION_CATALOGUE,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
} from '../permissions.constants';

describe('permission catalogue', () => {
  it('has a catalogue entry for every declared permission code', () => {
    const catalogued = new Set(PERMISSION_CATALOGUE.map(p => p.code));
    for (const code of Object.values(PERMISSIONS)) {
      expect(catalogued.has(code)).toBe(true);
    }
  });

  it('has no duplicate codes', () => {
    const codes = PERMISSION_CATALOGUE.map(p => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every catalogue entry both an English and an Arabic name', () => {
    for (const entry of PERMISSION_CATALOGUE) {
      expect(entry.nameEn.trim()).not.toBe('');
      expect(entry.nameAr.trim()).not.toBe('');
      // An untranslated row would be identical in both columns.
      expect(entry.nameAr).not.toBe(entry.nameEn);
    }
  });
});

describe('role permission map', () => {
  it('covers all five roles named in the acceptance criteria', () => {
    expect(Object.keys(ROLE_PERMISSION_MAP).sort()).toEqual(
      ['ADMIN', 'AGENT', 'CUSTOMER', 'MANAGER', 'SUPERVISOR'],
    );
  });

  it('grants Administrator every permission', () => {
    expect(ROLE_PERMISSION_MAP[ROLE_CODES.ADMIN].sort()).toEqual(
      PERMISSION_CATALOGUE.map(p => p.code).sort(),
    );
  });

  it('grants only Administrator the ability to deactivate users', () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
      const canDeactivate = perms.includes(PERMISSIONS.USERS_DEACTIVATE);
      expect(canDeactivate).toBe(role === ROLE_CODES.ADMIN);
    }
  });

  it('grants Customer read-only access', () => {
    expect(ROLE_PERMISSION_MAP[ROLE_CODES.CUSTOMER]).toEqual([PERMISSIONS.TICKETS_READ]);
  });

  it('references only codes that exist in the catalogue', () => {
    const catalogued = new Set(PERMISSION_CATALOGUE.map(p => p.code));
    for (const perms of Object.values(ROLE_PERMISSION_MAP)) {
      for (const code of perms) {
        expect(catalogued.has(code)).toBe(true);
      }
    }
  });

  it('does not let a non-admin role create users without also reading them', () => {
    for (const perms of Object.values(ROLE_PERMISSION_MAP)) {
      if (perms.includes(PERMISSIONS.USERS_CREATE)) {
        expect(perms).toContain(PERMISSIONS.USERS_READ);
      }
    }
  });
});
