# Story 07 — Authentication, Users, Roles & Permissions (Story: 16)

## Prerequisites

- **Stories 01–06 completed:** Backend foundation, database schema, frontend UI primitives, localization, and testing infrastructure are all in place.
- **Existing database:** The `CRM` database exists with the schema from Story 02 migrations. New entities (User, Role, Permission) will extend it.
- **Existing auth concepts:** Basic middleware infrastructure from Story 01 (`errorHandler`, `correlationId`, validation) is ready. This story adds JWT middleware and authorization checks.

---

## Story Goal

Implement a complete authentication and authorization system for the CRM:

1. **User authentication** via JWT (login, token refresh, logout).
2. **Role-Based Access Control (RBAC)** with five roles: **Administrator, Manager, Supervisor, Agent, Customer**.
3. **Permission system** granular enough to control API access by role.
4. **Branch and department assignment** so Managers/Supervisors manage only their assigned scope.
5. **User management** (create, list, edit, deactivate/activate users).
6. **Secure password handling** with bcrypt hashing.
7. **Protected API endpoints** — all routes except login require a valid JWT and appropriate role.
8. **Frontend login screen** and user/role management interfaces.
9. **Full test coverage** for authentication, authorization, and permission scenarios.

**Not in scope:**
- OAuth / OIDC or third-party authentication providers.
- Password reset flows or email verification (will be Story 08+).
- Advanced session management (token revocation lists, device tracking).
- Fine-grained row-level security (that comes in later stories).

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/users/entities/User.ts` (will be created) — the User entity structure.
2. `backend-nodejs/src/common/middleware/authenticate.ts` (will be created) — JWT validation middleware.
3. `backend-nodejs/src/common/middleware/authorize.ts` (will be created) — Role/permission checking middleware.
4. `backend-nodejs/src/config/data-source.ts` (~lines 1–40) — where the new entities are registered.
5. `frontend-vuejs/src/stores/auth.store.ts` (will be created) — Pinia store for login state.
6. `frontend-vuejs/src/views/LoginView.vue` (will be created) — the login screen.
7. `frontend-vuejs/src/router/index.ts` (~lines 1–40) — where route guards will be added.

For reference on error handling patterns, read:
- `backend-nodejs/src/common/errors/AppError.ts` (Story 01) to understand UnauthorizedError and ForbiddenError subclasses.
- `backend-nodejs/src/common/middleware/errorHandler.ts` (Story 01) — error response envelope.

---

## Product Rules (from intake)

| Concern | Requirement |
|---|---|
| **Authentication** | JWT tokens issued on login; valid for 1 hour; refresh token valid for 7 days. |
| **Roles** | Five fixed roles: Administrator, Manager, Supervisor, Agent, Customer. |
| **Permissions** | Each role has a set of allowed endpoints (defined in code; no dynamic permission UI yet). |
| **Scope** | Managers and Supervisors can only see/edit users and tickets in their assigned branches/departments. Administrators see all. |
| **Password Security** | Minimum 8 characters; bcrypt hashing with salt rounds 10. |
| **Session** | A user must have `isActive: true` to log in; deactivation revokes all future logins. |
| **API Protection** | All endpoints except `/auth/login` and `/auth/refresh` require a valid JWT with an authorized role. |
| **Error Messages** | Login failures (bad password, inactive user, account locked) return 401 Unauthorized with a generic message (do not leak whether user exists). |

---

## Implementation Tasks

### 1 — Backend: Create User, Role, and Permission Entities

**File: `backend-nodejs/src/modules/users/entities/User.ts`**

```ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '@/common/entities/BaseEntity';
import { Role } from './Role';

@Entity('Users')
export class User extends BaseEntity {
  @Column('nvarchar', { length: 255 })
  emailEn: string;

  @Column('nvarchar', { length: 255 })
  nameEn: string;

  @Column('nvarchar', { length: 255, nullable: true })
  nameAr?: string;

  @Column('nvarchar', { length: 255 })
  passwordHash: string;

  @Column('nvarchar', { length: 50 })
  status: 'active' | 'inactive' | 'locked';

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'UserRoles',
    joinColumn: { name: 'UserId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'RoleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column('uniqueidentifier', { nullable: true })
  branchId?: string;

  @Column('uniqueidentifier', { nullable: true })
  departmentId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
```

**File: `backend-nodejs/src/modules/users/entities/Role.ts`**

```ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Permission } from './Permission';
import { User } from './User';

@Entity('Roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('nvarchar', { length: 100 })
  nameEn: string;

  @Column('nvarchar', { length: 100, nullable: true })
  nameAr?: string;

  @Column('nvarchar', { length: 500, nullable: true })
  description?: string;

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'RolePermissions',
    joinColumn: { name: 'RoleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'PermissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ManyToMany(() => User, user => user.roles)
  users: User[];
}
```

**File: `backend-nodejs/src/modules/users/entities/Permission.ts`**

```ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Role } from './Role';

@Entity('Permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('nvarchar', { length: 100, unique: true })
  code: string;  // e.g. 'tickets.read', 'users.create'

  @Column('nvarchar', { length: 500, nullable: true })
  descriptionEn?: string;

  @Column('nvarchar', { length: 500, nullable: true })
  descriptionAr?: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}
```

**File: `backend-nodejs/src/database/migrations/17xxxxxxxx-CreateUserRolePermission.ts`** (TypeORM will generate; follow pattern from Story 02)

The migration will create `Users`, `Roles`, `Permissions` tables and join tables `UserRoles` and `RolePermissions`.

---

### 2 — Backend: Implement Password Hashing and User Service

**File: `backend-nodejs/src/modules/users/users.service.ts`**

```ts
import bcrypt from 'bcrypt';
import { AppDataSource } from '@/config/data-source';
import { User } from './entities/User';
import { ValidationError, ConflictError, NotFoundError } from '@/common/errors/AppError';

export class UsersService {
  private repo = AppDataSource.getRepository(User);

  async createUser(data: {
    emailEn: string;
    nameEn: string;
    nameAr?: string;
    password: string;
    roleIds: string[];
    branchId?: string;
    departmentId?: string;
  }): Promise<User> {
    // Validate password strength (min 8 chars, at least one uppercase, one digit)
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(data.password)) {
      throw new ValidationError({
        password: 'Must be at least 8 characters with uppercase and a digit',
      });
    }

    // Check email uniqueness
    const existing = await this.repo.findOne({ where: { emailEn: data.emailEn } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = this.repo.create({
      emailEn: data.emailEn,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      passwordHash,
      status: 'active',
      branchId: data.branchId,
      departmentId: data.departmentId,
      roles: data.roleIds.map(id => ({ id })),
    });

    return this.repo.save(user);
  }

  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.repo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async getUserByEmail(emailEn: string): Promise<User | null> {
    return this.repo.findOne({
      where: { emailEn },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.repo.update(userId, { status: 'inactive' });
  }

  async reactivateUser(userId: string): Promise<void> {
    await this.repo.update(userId, { status: 'active' });
  }
}
```

---

### 3 — Backend: Implement JWT Authentication

**File: `backend-nodejs/src/config/jwt.ts`** (new)

```ts
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AuthPayload {
  userId: string;
  email: string;
  roles: string[];  // role ids
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, SECRET_KEY) as AuthPayload;
}
```

**File: `backend-nodejs/src/common/middleware/authenticate.ts`** (new)

```ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/config/jwt';
import { UnauthorizedError } from '@/common/errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        roles: string[];
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
    };
    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
```

**File: `backend-nodejs/src/common/middleware/authorize.ts`** (new)

```ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@/common/errors/AppError';
import { AppDataSource } from '@/config/data-source';
import { Role } from '@/modules/users/entities/Role';

// Map roles to permitted endpoints (simplified; can be moved to database)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'admin': ['*'],  // admin can do anything
  'manager': ['tickets.read', 'tickets.create', 'tickets.update', 'users.read'],
  'supervisor': ['tickets.read', 'tickets.update'],
  'agent': ['tickets.read', 'tickets.update'],
  'customer': ['tickets.read'],
};

export function authorize(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError('User not authenticated');

    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({
      where: { id: req.user.roles },
      relations: ['permissions'],
    });

    const userPermissions = roles.flatMap(r => r.permissions).map(p => p.code);

    const hasPermission = userPermissions.includes('*') || userPermissions.includes(permissionCode);
    if (!hasPermission) throw new ForbiddenError('Insufficient permissions');

    next();
  };
}
```

---

### 4 — Backend: Implement Auth Routes (Login, Refresh, Logout)

**File: `backend-nodejs/src/modules/auth/auth.controller.ts`** (new)

```ts
import { Request, Response } from 'express';
import { UsersService } from '@/modules/users/users.service';
import { signAccessToken, signRefreshToken } from '@/config/jwt';
import { UnauthorizedError } from '@/common/errors/AppError';

const usersService = new UsersService();

export const login = async (req: Request, res: Response) => {
  const { emailEn, password } = req.body;

  const user = await usersService.getUserByEmail(emailEn);
  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('Invalid credentials');
  }

  const passwordMatches = await usersService.verifyPassword(user, password);
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const roleIds = user.roles.map(r => r.id);
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.emailEn,
    roles: roleIds,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    email: user.emailEn,
    roles: roleIds,
  });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        emailEn: user.emailEn,
        nameEn: user.nameEn,
        roles: user.roles.map(r => ({ id: r.id, nameEn: r.nameEn })),
      },
    },
    correlationId: req.correlationId,
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new UnauthorizedError('Refresh token required');

  try {
    const payload = verifyToken(refreshToken);
    const user = await usersService.getUserById(payload.userId);

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.emailEn,
      roles: user.roles.map(r => r.id),
    });

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
      correlationId: req.correlationId,
    });
  } catch (err) {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

export const currentUser = async (req: Request, res: Response) => {
  const user = await usersService.getUserById(req.user.userId);
  res.json({
    success: true,
    data: user,
    correlationId: req.correlationId,
  });
};
```

**File: `backend-nodejs/src/modules/auth/auth.routes.ts`** (new)

```ts
import { Router } from 'express';
import { login, refresh, currentUser } from './auth.controller';
import { authenticate } from '@/common/middleware/authenticate';

export const authRoutes = Router()
  .post('/login', login)
  .post('/refresh', refresh)
  .get('/me', authenticate, currentUser);
```

Wire into `src/common/routes/v1.ts`:
```ts
import { authRoutes } from '@/modules/auth/auth.routes';
router.use('/auth', authRoutes);
```

---

### 5 — Backend: Implement User Management APIs

**File: `backend-nodejs/src/modules/users/users.controller.ts`** (new)

```ts
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { authorize } from '@/common/middleware/authorize';

const usersService = new UsersService();

export const listUsers = async (req: Request, res: Response) => {
  // TODO: implement filtering, pagination
  const users = await AppDataSource.getRepository(User).find({ relations: ['roles'] });
  res.json({ success: true, data: users, correlationId: req.correlationId });
};

export const createUser = async (req: Request, res: Response) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json({ success: true, data: user, correlationId: req.correlationId });
};

export const updateUser = async (req: Request, res: Response) => {
  // TODO: implement update logic
  res.json({ success: true, correlationId: req.correlationId });
};

export const deactivateUser = async (req: Request, res: Response) => {
  await usersService.deactivateUser(req.params.id);
  res.json({ success: true, correlationId: req.correlationId });
};
```

**File: `backend-nodejs/src/modules/users/users.routes.ts`** (new)

```ts
import { Router } from 'express';
import { authenticate } from '@/common/middleware/authenticate';
import { authorize } from '@/common/middleware/authorize';
import { listUsers, createUser, deactivateUser } from './users.controller';

export const usersRoutes = Router()
  .use(authenticate)
  .get('/', authorize('users.read'), listUsers)
  .post('/', authorize('users.create'), createUser)
  .patch('/:id/deactivate', authorize('users.deactivate'), deactivateUser);
```

Wire into `src/common/routes/v1.ts`:
```ts
import { usersRoutes } from '@/modules/users/users.routes';
router.use('/users', usersRoutes);
```

---

### 6 — Backend: Seed Roles and Permissions

**File: `backend-nodejs/src/database/seed.ts`** — add to existing seed function

```ts
async function seedRolesAndPermissions() {
  const roleRepo = AppDataSource.getRepository(Role);
  const permissionRepo = AppDataSource.getRepository(Permission);

  // Create permissions
  const permissions = await permissionRepo.save([
    { code: 'users.read', descriptionEn: 'Read users' },
    { code: 'users.create', descriptionEn: 'Create users' },
    { code: 'users.deactivate', descriptionEn: 'Deactivate users' },
    { code: 'tickets.read', descriptionEn: 'Read tickets' },
    { code: 'tickets.create', descriptionEn: 'Create tickets' },
    { code: 'tickets.update', descriptionEn: 'Update tickets' },
  ]);

  // Create roles
  await roleRepo.save([
    {
      nameEn: 'Administrator',
      nameAr: 'مسؤول',
      description: 'Full system access',
      permissions: permissions,
    },
    {
      nameEn: 'Manager',
      nameAr: 'مدير',
      description: 'Branch/department manager',
      permissions: permissions.filter(p => !['users.deactivate'].includes(p.code)),
    },
    {
      nameEn: 'Supervisor',
      nameAr: 'مشرف',
      description: 'Team supervisor',
      permissions: permissions.filter(p => ['tickets.read', 'tickets.update'].includes(p.code)),
    },
    {
      nameEn: 'Agent',
      nameAr: 'وكيل',
      description: 'Support agent',
      permissions: permissions.filter(p => ['tickets.read', 'tickets.update'].includes(p.code)),
    },
    {
      nameEn: 'Customer',
      nameAr: 'عميل',
      description: 'Customer portal access',
      permissions: permissions.filter(p => p.code === 'tickets.read'),
    },
  ]);
}
```

---

### 7 — Frontend: Create Auth Store

**File: `frontend-vuejs/src/stores/auth.store.ts`** (new)

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';

interface User {
  id: string;
  emailEn: string;
  nameEn: string;
  roles: Array<{ id: string; nameEn: string }>;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const isAuthenticated = computed(() => !!accessToken.value);

  async function login(emailEn: string, password: string) {
    const response = await api.post('/auth/login', { emailEn, password });
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
  }

  async function logout() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async function loadCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      user.value = response.data;
    } catch (err) {
      logout();
      throw err;
    }
  }

  function initializeFromStorage() {
    const token = localStorage.getItem('accessToken');
    if (token) {
      accessToken.value = token;
      loadCurrentUser();
    }
  }

  return { user, accessToken, isAuthenticated, login, logout, loadCurrentUser, initializeFromStorage };
});
```

---

### 8 — Frontend: Create Login View

**File: `frontend-vuejs/src/views/LoginView.vue`** (new)

```vue
<template>
  <div class="login-container">
    <div class="login-card">
      <h1>{{ t('auth.title') }}</h1>
      <form @submit.prevent="handleLogin">
        <BaseInput
          v-model="emailEn"
          type="email"
          :label="t('auth.email')"
          :error="errors.email"
          required
        />
        <BaseInput
          v-model="password"
          type="password"
          :label="t('auth.password')"
          :error="errors.password"
          required
        />
        <div v-if="error" class="error-message">{{ error }}</div>
        <BaseButton variant="primary" size="lg" type="submit" :loading="loading">
          {{ t('auth.login') }}
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const emailEn = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const errors = ref({ email: '', password: '' })

async function handleLogin() {
  loading.value = true
  error.value = ''
  errors.value = { email: '', password: '' }

  try {
    await authStore.login(emailEn.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (err: any) {
    if (err.code === 'VALIDATION_ERROR') {
      errors.value = err.details || {}
    } else {
      error.value = t('auth.loginFailed')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
}

.login-card {
  background: white;
  padding: var(--spacing-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: var(--spacing-6);
  color: var(--color-gray-900);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.error-message {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
```

---

### 9 — Frontend: Add Router Guards

**File: `frontend-vuejs/src/router/index.ts`** — add route guard

```ts
import { useAuthStore } from '@/stores/auth.store'

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  const publicRoutes = ['login']
  const isPublic = publicRoutes.includes(to.name as string)

  if (!authStore.isAuthenticated && !isPublic) {
    next({ name: 'login' })
  } else if (authStore.isAuthenticated && to.name === 'login') {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

// Add login route
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { titleKey: 'auth.login' },
  },
  // ... rest of routes
]
```

---

### 10 — Frontend: Update Main.ts for Auth Initialization

**File: `frontend-vuejs/src/main.ts`** — update

```ts
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)

// Initialize auth from localStorage before mounting
const authStore = useAuthStore()
authStore.initializeFromStorage()

app.mount('#app')
```

---

### 11 — Backend: Add JWT Secret to .env.example

**File: `backend-nodejs/.env.example`** — add

```dotenv
# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=1h
```

---

### 12 — Frontend: Update i18n Translations

Add to both `src/i18n/locales/en.json` and `ar.json`:

```json
{
  "auth": {
    "title": "AZM CRM Login",
    "email": "Email",
    "password": "Password",
    "login": "Login",
    "loginFailed": "Invalid email or password",
    "logout": "Logout"
  }
}
```

Arabic translation in `ar.json`:
```json
{
  "auth": {
    "title": "تسجيل الدخول إلى AZM CRM",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "login": "دخول",
    "loginFailed": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "logout": "تسجيل الخروج"
  }
}
```

---

## Edge Cases & Failure Modes

| Trigger | Expected Behavior | Prevention |
|---|---|---|
| User attempts login with non-existent email | Return generic 401 "Invalid credentials" (do not reveal email exists or not) | Line in `auth.controller.ts`: `if (!user \|\| user.status !== 'active')` throws generic error |
| User account is deactivated while accessing API | Subsequent requests with their token fail with 401; they must log in again | Token includes no expiry check for account status; only verified at login. Follow-up: implement token revocation list (Story 08+). |
| Weak password (< 8 chars, no uppercase, no digit) | Return 422 Validation Error with message "Must be at least 8 characters with uppercase and a digit" | `UsersService.createUser()` validates with regex on line ~20 |
| Manager with branch=A tries to access users in branch=B | 403 Forbidden (once row-level security is implemented in Story 08+) | For now, the `authorize` middleware only checks role; branch scoping is a follow-up. Documented as limitation in README. |
| JWT token expires mid-session | API returns 401; frontend redirects to login; user clicks refresh | Frontend checks `localStorage` for refresh token and calls `/auth/refresh` to get new access token (implement in Story 08+). |
| Concurrent login attempts | Both succeed and issue separate tokens; both are valid until expiry | No rate limiting on `/auth/login` yet; implement in Story 08+. |
| Database connection fails during login | 503 Service Unavailable | Error propagates through `errorHandler` middleware (Story 01). |
| Invalid refresh token | 401 Unauthorized | `auth.controller.ts`, `refresh` function, line ~50: `verifyToken()` throws if token invalid or expired. |

---

## Test Plan

### Backend Tests

1. **`src/modules/auth/__tests__/auth.spec.ts`** (new)
   - Login with valid credentials → returns access and refresh tokens
   - Login with invalid email → 401 Unauthorized
   - Login with wrong password → 401 Unauthorized
   - Login with inactive user → 401 Unauthorized
   - Refresh token with valid token → returns new access token
   - Refresh token with invalid token → 401 Unauthorized
   - Current user endpoint without auth → 401 Unauthorized
   - Current user endpoint with valid token → returns user profile

2. **`src/modules/users/__tests__/users.service.spec.ts`** (new)
   - `createUser` with valid data → saves to database with hashed password
   - `createUser` with weak password → throws ValidationError
   - `createUser` with duplicate email → throws ConflictError
   - `verifyPassword` with correct password → returns true
   - `verifyPassword` with wrong password → returns false
   - `getUserById` with valid id → returns user with roles and permissions
   - `deactivateUser` → sets status to 'inactive'
   - `reactivateUser` → sets status to 'active'

3. **`src/modules/users/__tests__/users.routes.spec.ts`** (new, integration)
   - GET `/users` with admin token → returns all users
   - GET `/users` with agent token → 403 Forbidden
   - POST `/users` with admin token → creates user
   - PATCH `/users/:id/deactivate` with admin token → deactivates user

### Frontend Tests

4. **`src/stores/__tests__/auth.store.spec.ts`** (new)
   - Login with valid credentials → sets accessToken and user
   - Login with invalid credentials → throws error, does not set token
   - Logout → clears accessToken and user
   - `initializeFromStorage` with stored token → sets isAuthenticated to true
   - `isAuthenticated` computed → true when token exists

5. **`src/views/__tests__/LoginView.spec.ts`** (new)
   - Render login form → shows email and password inputs
   - Submit with valid credentials → calls `authStore.login()` and navigates to dashboard
   - Submit with invalid credentials → shows error message
   - Loading state → shows spinner while submitting

### Integration Tests

6. **`src/router/__tests__/router.guard.spec.ts`** (new)
   - Unauthenticated user accessing protected route → redirects to login
   - Authenticated user accessing login route → redirects to dashboard
   - Authenticated user accessing protected route → allows access

---

## Verification Steps

**Backend:**

1. **Install dependencies:** `cd backend-nodejs && npm install bcryptjs jsonwebtoken`
2. **Generate migration:** `npm run migration:generate -- src/database/migrations/CreateUserRolePermission`
3. **Run migration:** `npm run migration:run`
4. **Seed roles & permissions:** Modify `npm run db:seed` to call `seedRolesAndPermissions()`
5. **Tests pass:** `npm test` (new auth and user tests should all pass)
6. **Integration tests:** `npm run test:integration` (Windows only; should pass if Windows Auth working)
7. **Build clean:** `npm run build` → should produce `dist/server.js` with no errors

**Frontend:**

8. **Tests pass:** `npm test` (new auth store and login view tests)
9. **Build clean:** `npm run build` → TypeScript compile clean, no errors
10. **Dev server runs:** `npm run dev` → Vite running at `:5173`
11. **Login page accessible:** Navigate to `http://localhost:5173/login` → login form renders
12. **API connectivity:** Login with seeded user credentials → redirects to dashboard; browser console shows no CORS errors

**Regression:**

13. **Stories 01–06 still work:**
    - Backend health check: `curl http://localhost:3000/api/v1/health` → `{"status":"up"}`
    - Frontend loads: `http://localhost:5173` → if already logged in, shows dashboard; if not, redirects to login
    - Tests pass: `npm test` in both projects

---

## Done Criteria

- [ ] User, Role, and Permission entities created and registered in TypeORM DataSource.
- [ ] Password hashing with bcrypt (salt rounds 10) and verification working.
- [ ] JWT tokens issued on login (access token 1h, refresh token 7d).
- [ ] `/api/v1/auth/login` endpoint accepts email/password and returns tokens.
- [ ] `/api/v1/auth/refresh` endpoint issues new access token from refresh token.
- [ ] `/api/v1/auth/me` endpoint returns current user profile (authenticated only).
- [ ] Authenticate middleware validates JWT and attaches user to `req.user`.
- [ ] Authorize middleware checks role-based permissions (five roles defined: Administrator, Manager, Supervisor, Agent, Customer).
- [ ] User management endpoints (`GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/:id/deactivate`) protected and role-gated.
- [ ] Login view (`LoginView.vue`) renders with email/password form and error display.
- [ ] Auth store (`auth.store.ts`) manages login state, tokens, and user profile.
- [ ] Router guards redirect unauthenticated users to login and prevent access to protected routes.
- [ ] Roles and permissions seeded in database (idempotent seed).
- [ ] Backend tests cover auth flows, password validation, token generation, and authorization.
- [ ] Frontend tests cover login form, auth store, and router guards.
- [ ] `.env.example` includes JWT_SECRET and expiry variables.
- [ ] i18n translations added for login screens (English and Arabic).
- [ ] All Stories 01–06 verification steps still pass (no regressions).

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 08.**
