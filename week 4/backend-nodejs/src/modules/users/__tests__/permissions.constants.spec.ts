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

  it('includes all four customer permissions in the catalogue', () => {
    const catalogued = new Set(PERMISSION_CATALOGUE.map(p => p.code));
    expect(catalogued.has(PERMISSIONS.CUSTOMERS_READ)).toBe(true);
    expect(catalogued.has(PERMISSIONS.CUSTOMERS_CREATE)).toBe(true);
    expect(catalogued.has(PERMISSIONS.CUSTOMERS_UPDATE)).toBe(true);
    expect(catalogued.has(PERMISSIONS.CUSTOMERS_DELETE)).toBe(true);
  });

  it('grants Admin all customer permissions', () => {
    const adminPerms = ROLE_PERMISSION_MAP[ROLE_CODES.ADMIN];
    expect(adminPerms).toContain(PERMISSIONS.CUSTOMERS_READ);
    expect(adminPerms).toContain(PERMISSIONS.CUSTOMERS_CREATE);
    expect(adminPerms).toContain(PERMISSIONS.CUSTOMERS_UPDATE);
    expect(adminPerms).toContain(PERMISSIONS.CUSTOMERS_DELETE);
  });

  it('grants Agent create but not delete for customers', () => {
    const agentPerms = ROLE_PERMISSION_MAP[ROLE_CODES.AGENT];
    expect(agentPerms).toContain(PERMISSIONS.CUSTOMERS_CREATE);
    expect(agentPerms).not.toContain(PERMISSIONS.CUSTOMERS_DELETE);
  });

  it('does not grant Customer any customer permissions', () => {
    const customerPerms = ROLE_PERMISSION_MAP[ROLE_CODES.CUSTOMER];
    expect(customerPerms).not.toContain(PERMISSIONS.CUSTOMERS_READ);
    expect(customerPerms).not.toContain(PERMISSIONS.CUSTOMERS_CREATE);
    expect(customerPerms).not.toContain(PERMISSIONS.CUSTOMERS_UPDATE);
    expect(customerPerms).not.toContain(PERMISSIONS.CUSTOMERS_DELETE);
  });

  it('includes all four ticket permissions in the catalogue', () => {
    const catalogued = new Set(PERMISSION_CATALOGUE.map(p => p.code));
    expect(catalogued.has(PERMISSIONS.TICKETS_READ)).toBe(true);
    expect(catalogued.has(PERMISSIONS.TICKETS_CREATE)).toBe(true);
    expect(catalogued.has(PERMISSIONS.TICKETS_UPDATE)).toBe(true);
    expect(catalogued.has(PERMISSIONS.TICKETS_ASSIGN)).toBe(true);
  });

  it('grants Agent create but not assign for tickets', () => {
    const agentPerms = ROLE_PERMISSION_MAP[ROLE_CODES.AGENT];
    expect(agentPerms).toContain(PERMISSIONS.TICKETS_CREATE);
    expect(agentPerms).not.toContain(PERMISSIONS.TICKETS_ASSIGN);
  });

  it('grants Manager and Supervisor assign permission', () => {
    const managerPerms = ROLE_PERMISSION_MAP[ROLE_CODES.MANAGER];
    const supervisorPerms = ROLE_PERMISSION_MAP[ROLE_CODES.SUPERVISOR];
    expect(managerPerms).toContain(PERMISSIONS.TICKETS_ASSIGN);
    expect(supervisorPerms).toContain(PERMISSIONS.TICKETS_ASSIGN);
  });

  it('does not grant Agent assign permission', () => {
    const agentPerms = ROLE_PERMISSION_MAP[ROLE_CODES.AGENT];
    expect(agentPerms).not.toContain(PERMISSIONS.TICKETS_ASSIGN);
  });

  it('grants Customer read-only access to tickets', () => {
    const customerPerms = ROLE_PERMISSION_MAP[ROLE_CODES.CUSTOMER];
    expect(customerPerms).toContain(PERMISSIONS.TICKETS_READ);
    expect(customerPerms).not.toContain(PERMISSIONS.TICKETS_CREATE);
    expect(customerPerms).not.toContain(PERMISSIONS.TICKETS_UPDATE);
    expect(customerPerms).not.toContain(PERMISSIONS.TICKETS_ASSIGN);
  });
});
