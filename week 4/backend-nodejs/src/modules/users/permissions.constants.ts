/**
 * The authoritative permission catalogue. The seed writes exactly these rows into
 * [Permissions], and route handlers reference these codes via `authorize(...)`.
 * Adding a permission here requires a re-run of `npm run db:seed`.
 */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DEACTIVATE: 'users.deactivate',
  ROLES_READ: 'roles.read',
  TICKETS_READ: 'tickets.read',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_UPDATE: 'tickets.update',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOGUE: Array<{ code: PermissionCode; nameEn: string; nameAr: string }> = [
  { code: PERMISSIONS.USERS_READ, nameEn: 'View users', nameAr: 'عرض المستخدمين' },
  { code: PERMISSIONS.USERS_CREATE, nameEn: 'Create users', nameAr: 'إنشاء المستخدمين' },
  { code: PERMISSIONS.USERS_UPDATE, nameEn: 'Edit users', nameAr: 'تعديل المستخدمين' },
  { code: PERMISSIONS.USERS_DEACTIVATE, nameEn: 'Activate or deactivate users', nameAr: 'تفعيل أو تعطيل المستخدمين' },
  { code: PERMISSIONS.ROLES_READ, nameEn: 'View roles', nameAr: 'عرض الأدوار' },
  { code: PERMISSIONS.TICKETS_READ, nameEn: 'View tickets', nameAr: 'عرض التذاكر' },
  { code: PERMISSIONS.TICKETS_CREATE, nameEn: 'Create tickets', nameAr: 'إنشاء التذاكر' },
  { code: PERMISSIONS.TICKETS_UPDATE, nameEn: 'Edit tickets', nameAr: 'تعديل التذاكر' },
];

export const ROLE_CODES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT',
  CUSTOMER: 'CUSTOMER',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

/** Which permissions each seeded role holds. Administrator holds every permission. */
export const ROLE_PERMISSION_MAP: Record<RoleCode, PermissionCode[]> = {
  [ROLE_CODES.ADMIN]: PERMISSION_CATALOGUE.map(p => p.code),
  [ROLE_CODES.MANAGER]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
  ],
  [ROLE_CODES.SUPERVISOR]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
  ],
  [ROLE_CODES.AGENT]: [
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_UPDATE,
  ],
  [ROLE_CODES.CUSTOMER]: [
    PERMISSIONS.TICKETS_READ,
  ],
};
