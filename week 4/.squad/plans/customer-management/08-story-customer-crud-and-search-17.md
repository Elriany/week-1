# Story 08 — Customer CRUD & Search (Story: 17)

## Prerequisites

- **Story 07 completed** ([../user-management/07-story-authentication-and-authorization-16.md](../user-management/07-story-authentication-and-authorization-16.md)) — `authenticate` / `authorize` middleware, the permission catalogue, and branch scoping all exist and are the direct pattern this story copies.
- **Stories 01–06 completed** — Express app, TypeORM DataSource, migration runner, seed, UI primitives, i18n, and Vitest projects are in place.
- **The `Customers` table already exists.** It was created by the Story 02 migration `backend-nodejs/src/database/migrations/1724086800000-InitialCrmSchema.ts` (~lines 78–96) and the entity `backend-nodejs/src/modules/customers/customer.entity.ts` is already mapped to it. **Do not create a new Customers table** — this story extends the existing one.
- **`Tickets.customerId` already references `Customers.id`** (`backend-nodejs/src/modules/tickets/ticket.entity.ts`, ~lines 37–42). Story 10 surfaces that relationship; this story only needs to avoid breaking it.

---

## Story Goal

Deliver the customer record as a first-class, managed resource:

1. **Extend the customer profile** with an `isActive` flag so a dormant customer can be deactivated instead of deleted.
2. **Customer CRUD APIs** — list, fetch one, create, update, deactivate/activate, and soft-delete.
3. **Search and filtering** — free-text search across name (English and Arabic), code, email, and phone, plus filters on branch and active state, with **pagination**.
4. **Branch scoping** — non-Administrators only see and manage customers in their own branch, matching the rule already enforced for users.
5. **Customer list screen** with a search box, status filter, pagination controls, and a create form.
6. **Test coverage** for CRUD, search behaviour, scoping, and code generation.

**Not in scope** (later stories in this feature):
- Customer contacts and notes → Story 09.
- Attachments and interaction history → Story 10.
- The customer **profile / details** screen → Story 09. This story ships the **list** screen only; rows are not yet clickable.
- Merging or de-duplicating customer records.
- Bulk import/export.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/customers/customer.entity.ts` — the **entire file** (33 lines). Note the existing columns `branchId`, `code`, `fullNameEn`, `fullNameAr`, `email`, `phone`, `preferredLanguage`, and that it extends `BaseEntity`.
2. `backend-nodejs/src/common/entities/BaseEntity.ts` — all 15 lines. It supplies `id`, `createdAt`, `updatedAt`, and a `@DeleteDateColumn` `deletedAt`, which is what makes **soft delete** available without new columns.
3. `backend-nodejs/src/modules/users/users.service.ts` — the **whole file** (171 lines). This is the service pattern to copy: **exported functions, not a class**; a `toPublicX` mapper (~lines 48–64); a repository accessor `const users = () => AppDataSource.getRepository(User)` (~line 74); and `listUsers` building a query with `createQueryBuilder` (~lines 108–119).
4. `backend-nodejs/src/modules/users/users.controller.ts` — ~lines 20–52. `isUnscoped()` and how `list` **overrides** the branch filter rather than rejecting the request. Copy this behaviour exactly.
5. `backend-nodejs/src/modules/users/users.routes.ts` — ~lines 15–49. Note `router.use(authenticate)` on line 18 applying to every route below, the `authorize(...)` + `validate({...})` middleware order, and the comment on line 48 explaining why a literal path is declared **before** `/:id`.
6. `backend-nodejs/src/modules/users/users.schemas.ts` — all 40 lines. Zod schema style, including the `z.enum(['true','false']).transform(...)` idiom for boolean query params (~lines 32–35).
7. `backend-nodejs/src/modules/users/permissions.constants.ts` — all 65 lines. New permission codes go in **three** places: `PERMISSIONS` (~lines 6–15), `PERMISSION_CATALOGUE` (~lines 19–28), and `ROLE_PERMISSION_MAP` (~lines 41–65).
8. `backend-nodejs/src/database/migrations/1756000000000-AuthPermissions.ts` — all 46 lines. The migration style: raw `queryRunner.query` with bracketed identifiers and a real `down()`.
9. `backend-nodejs/src/config/data-source.ts` — line 19. Entities are auto-discovered by the glob `modules/**/*.entity.{ts,js}`, so **new entity files need no manual registration**.
10. `backend-nodejs/src/routes/v1.ts` — all 13 lines. One `v1.use(...)` line per module.
11. `frontend-vuejs/src/views/UsersView.vue` — the **whole file** (346 lines). The list-screen pattern: `BaseCard` + header slot, loading/error/empty branches (~lines 19–29), a scrolling table (~lines 31–68), an inline create form (~lines 71–107), and `messageFor()` mapping status codes to translations (~lines 171–178).
12. `frontend-vuejs/src/router/index.ts` — ~lines 15–58 for route shape and `meta.permission`, and ~lines 65–82 for the guard that enforces it.
13. `frontend-vuejs/src/components/layout/AppSidebar.vue` — ~lines 45–54. `navItems` and the `visibleNavItems` permission filter.
14. `backend-nodejs/src/database/seed.ts` — ~lines 203–219. The existing single demo customer `CUST001`.

Grep targets:
- Grep for `isUnscoped` in `backend-nodejs/src/modules/` to see every place branch scoping is applied.
- Grep for `ROLE_PERMISSION_MAP` to confirm the Administrator entry derives from `PERMISSION_CATALOGUE` and therefore picks up new codes automatically.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Identity** | Every customer has a unique `code`. It is **server-generated** when the client omits it, and validated for uniqueness when supplied. |
| **Deactivate vs delete** | `isActive: false` means dormant but retained and still visible with a filter. `DELETE` performs a **soft delete** (sets `deletedAt`), hiding the row from all reads. Tickets keep referencing the row either way. |
| **Scope** | Administrators see every branch. Every other role is confined to the branch on their own user record — for listing, fetching, creating, and updating. |
| **Search** | One `q` parameter matches **any** of `fullNameEn`, `fullNameAr`, `code`, `email`, `phone` as a substring, case-insensitively. |
| **Pagination** | Always applied. Default `pageSize` 20, maximum 100. |
| **Customer role** | The `CUSTOMER` role gets **no** customer permissions — a customer must never enumerate other customers. |

---

## Backend Tasks

### 1 — Add the `isActive` column

**Create file: `backend-nodejs/src/database/migrations/1757000000000-CustomerManagement.ts`**

Follow the style of `1756000000000-AuthPermissions.ts` exactly.

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerManagement1757000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing rows are active customers, so default 1 and backfill in one step.
    await queryRunner.query(`
      ALTER TABLE [Customers] ADD [isActive] bit NOT NULL CONSTRAINT [DF_Customers_isActive] DEFAULT 1
    `);

    // Search filters on active state within a branch; this index serves the common list query.
    await queryRunner.query(
      `CREATE INDEX [IDX_Customers_branchId_isActive] ON [Customers]([branchId], [isActive])`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_Customers_branchId_isActive] ON [Customers]`);
    await queryRunner.query(`ALTER TABLE [Customers] DROP CONSTRAINT [DF_Customers_isActive]`);
    await queryRunner.query(`ALTER TABLE [Customers] DROP COLUMN [isActive]`);
  }
}
```

**A named `DEFAULT` constraint is required.** SQL Server auto-generates a random constraint name otherwise, and `down()` cannot then drop the column.

**File: `backend-nodejs/src/modules/customers/customer.entity.ts`**

Append one column to the existing class — **change nothing else**:

```ts
  @Column({ type: 'bit', default: true })
  isActive!: boolean;
```

Note: `code` uniqueness is enforced by the `UNIQUE` **column constraint** in the original DDL (line 82 of the initial migration), not by `IDX_Customers_code`, which is a plain index. Rely on the constraint; do not add another.

---

### 2 — Add customer permissions

**File: `backend-nodejs/src/modules/users/permissions.constants.ts`**

Add to `PERMISSIONS`:

```ts
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
```

Add matching bilingual entries to `PERMISSION_CATALOGUE`:

```ts
  { code: PERMISSIONS.CUSTOMERS_READ, nameEn: 'View customers', nameAr: 'عرض العملاء' },
  { code: PERMISSIONS.CUSTOMERS_CREATE, nameEn: 'Create customers', nameAr: 'إنشاء العملاء' },
  { code: PERMISSIONS.CUSTOMERS_UPDATE, nameEn: 'Edit customers', nameAr: 'تعديل العملاء' },
  { code: PERMISSIONS.CUSTOMERS_DELETE, nameEn: 'Delete customers', nameAr: 'حذف العملاء' },
```

Extend `ROLE_PERMISSION_MAP`:

| Role | Add |
|---|---|
| `ADMIN` | nothing — its entry is `PERMISSION_CATALOGUE.map(p => p.code)` and picks these up automatically |
| `MANAGER` | `CUSTOMERS_READ`, `CUSTOMERS_CREATE`, `CUSTOMERS_UPDATE`, `CUSTOMERS_DELETE` |
| `SUPERVISOR` | `CUSTOMERS_READ`, `CUSTOMERS_CREATE`, `CUSTOMERS_UPDATE` |
| `AGENT` | `CUSTOMERS_READ`, `CUSTOMERS_CREATE`, `CUSTOMERS_UPDATE` — an agent taking a call must be able to register the caller |
| `CUSTOMER` | **nothing** |

**Re-running `npm run db:seed` is mandatory** after this edit, or the new codes exist in TypeScript but not in `[Permissions]`, and every customer route returns 403.

---

### 3 — Customer service

**Create file: `backend-nodejs/src/modules/customers/customers.service.ts`**

Mirror `users.service.ts`: exported functions, a repository accessor, and a `toPublicCustomer` mapper.

```ts
import { AppDataSource } from '../../config/data-source';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Customer } from './customer.entity';

export interface PublicCustomer {
  id: string;
  code: string;
  fullNameEn: string;
  fullNameAr: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  isActive: boolean;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  code?: string;
  fullNameEn: string;
  fullNameAr: string;
  email?: string | null;
  phone?: string | null;
  preferredLanguage?: string;
  branchId: string;
}

export interface UpdateCustomerInput {
  fullNameEn?: string;
  fullNameAr?: string;
  email?: string | null;
  phone?: string | null;
  preferredLanguage?: string;
}

export interface ListCustomersFilter {
  q?: string;
  branchId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedCustomers {
  items: PublicCustomer[];
  total: number;
  page: number;
  pageSize: number;
}

export function toPublicCustomer(c: Customer): PublicCustomer {
  return {
    id: c.id,
    code: c.code,
    fullNameEn: c.fullNameEn,
    fullNameAr: c.fullNameAr,
    email: c.email ?? null,
    phone: c.phone ?? null,
    preferredLanguage: c.preferredLanguage,
    isActive: c.isActive,
    branchId: c.branchId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const customers = () => AppDataSource.getRepository(Customer);
```

**Code generation.** Add a helper that produces the next sequential code:

```ts
const CODE_PREFIX = 'CUST';

/**
 * Produces the next free customer code, e.g. CUST0007.
 *
 * Reads the highest existing numeric suffix rather than counting rows, so codes
 * are not reused after a delete. `withDeleted` is set because a soft-deleted row
 * still occupies its code — the UNIQUE constraint does not ignore it.
 */
async function generateCode(): Promise<string> {
  const row = await customers()
    .createQueryBuilder('c')
    .withDeleted()
    .where('c.code LIKE :prefix', { prefix: `${CODE_PREFIX}%` })
    .orderBy('LEN(c.code)', 'DESC')
    .addOrderBy('c.code', 'DESC')
    .getOne();

  const lastNumber = row ? Number.parseInt(row.code.slice(CODE_PREFIX.length), 10) : 0;
  const next = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  return `${CODE_PREFIX}${String(next).padStart(4, '0')}`;
}
```

Ordering by `LEN(code)` first then `code` keeps `CUST0010` above `CUST0009`; a plain string sort would not.

**List with search and pagination:**

```ts
export async function listCustomers(filter: ListCustomersFilter = {}): Promise<PagedCustomers> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const qb = customers().createQueryBuilder('c');

  if (filter.branchId) qb.andWhere('c.branchId = :branchId', { branchId: filter.branchId });
  if (filter.isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive: filter.isActive });

  if (filter.q) {
    // One term, any field. Escape LIKE wildcards so a literal % or _ in the
    // search box does not turn into a match-everything query.
    const term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
    qb.andWhere(
      `(c.fullNameEn LIKE :term OR c.fullNameAr LIKE :term
        OR c.code LIKE :term OR c.email LIKE :term OR c.phone LIKE :term)`,
      { term },
    );
  }

  qb.orderBy('c.fullNameEn', 'ASC')
    .skip((page - 1) * pageSize)
    .take(pageSize);

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(toPublicCustomer), total, page, pageSize };
}
```

The database collation is `Arabic_CI_AS` (set by `npm run db:create`), so `LIKE` is already case-insensitive for both scripts. **Do not** wrap the columns in `LOWER()` — that would defeat the index and is unnecessary here.

**Remaining functions** — `findById`, `createCustomer`, `updateCustomer`, `setCustomerActive`, `softDeleteCustomer`:

```ts
export async function findById(id: string): Promise<Customer> {
  const customer = await customers().findOne({ where: { id } });
  if (!customer) throw new NotFoundError('Customer');
  return customer;
}

export async function createCustomer(input: CreateCustomerInput): Promise<PublicCustomer> {
  const code = input.code?.trim() || (await generateCode());

  // A soft-deleted row still holds its code, so check with `withDeleted`.
  const clash = await customers()
    .createQueryBuilder('c')
    .withDeleted()
    .where('c.code = :code', { code })
    .getOne();
  if (clash) throw new ConflictError('A customer with this code already exists');

  const saved = await customers().save(
    customers().create({
      code,
      fullNameEn: input.fullNameEn,
      fullNameAr: input.fullNameAr,
      email: input.email ?? null,
      phone: input.phone ?? null,
      preferredLanguage: input.preferredLanguage ?? 'en',
      branchId: input.branchId,
      isActive: true,
    }),
  );

  return toPublicCustomer(await findById(saved.id));
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<PublicCustomer> {
  const customer = await findById(id);
  Object.assign(customer, input);
  await customers().save(customer);
  return toPublicCustomer(await findById(id));
}

export async function setCustomerActive(id: string, isActive: boolean): Promise<PublicCustomer> {
  const customer = await findById(id);
  customer.isActive = isActive;
  await customers().save(customer);
  return toPublicCustomer(await findById(id));
}

/** Soft delete — sets `deletedAt`. Tickets keep their `customerId` reference. */
export async function softDeleteCustomer(id: string): Promise<void> {
  await findById(id);            // 404 before 204
  await customers().softDelete(id);
}
```

**`code` is deliberately absent from `UpdateCustomerInput`.** A customer code is an external identifier printed on correspondence; changing it silently breaks every reference. Leave it immutable and note the decision in a comment.

---

### 4 — Validation schemas

**Create file: `backend-nodejs/src/modules/customers/customers.schemas.ts`**

```ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  fullNameEn: z.string().min(1).max(200),
  fullNameAr: z.string().min(1).max(200),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  preferredLanguage: z.enum(['en', 'ar']).optional(),
  branchId: z.string().uuid(),
});

export const updateCustomerSchema = z
  .object({
    fullNameEn: z.string().min(1).max(200).optional(),
    fullNameAr: z.string().min(1).max(200).optional(),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    preferredLanguage: z.enum(['en', 'ar']).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const customerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCustomersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  branchId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const setCustomerActiveSchema = z.object({
  isActive: z.boolean(),
});
```

`.nullish()` on `email`/`phone` lets a client clear a field by sending `null`, which `.optional()` alone would not permit.

---

### 5 — Controller

**Create file: `backend-nodejs/src/modules/customers/customers.controller.ts`**

Copy the scoping helper from `users.controller.ts` (~lines 20–22) verbatim in spirit:

```ts
import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  setCustomerActive,
  softDeleteCustomer,
  findById,
  toPublicCustomer,
  type ListCustomersFilter,
} from './customers.service';

/** Administrators operate across every branch; everyone else is pinned to their own. */
function isUnscoped(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.roleCode === ROLE_CODES.ADMIN;
}
```

Handlers to implement:

| Handler | Behaviour |
|---|---|
| `list` | Take `req.query` as the filter. If not unscoped, **overwrite** `filter.branchId` with `req.auth!.branchId` — never reject, because the caller may have omitted it. Respond `{ success: true, data: <PagedCustomers>, correlationId }`. |
| `getOne` | `findById`, then if not unscoped and `customer.branchId !== req.auth!.branchId` throw `ForbiddenError('This customer belongs to another branch')`. |
| `create` | If not unscoped and `body.branchId !== req.auth!.branchId` throw `ForbiddenError('You can only create customers in your own branch')`. Respond **201**. |
| `update` | Load first, apply the same branch check, then update. |
| `setActive` | Same branch check, then `setCustomerActive`. |
| `remove` | Same branch check, then `softDeleteCustomer`, then `res.status(204).send()`. |

Every handler wraps its body in `try { … } catch (err) { next(err) }` — the codebase has no async error wrapper, and an unhandled rejection would hang the request.

Export as `export const customersController = { list, getOne, create, update, setActive, remove };`

---

### 6 — Routes

**Create file: `backend-nodejs/src/modules/customers/customers.routes.ts`**

Mirror `users.routes.ts` including the `@openapi` JSDoc blocks — Swagger reads them and the spec is part of the deliverable.

```ts
const router = Router();

// Every route below requires a valid access token.
router.use(authenticate);

router.get('/',    authorize(PERMISSIONS.CUSTOMERS_READ),   validate({ query: listCustomersQuerySchema }), customersController.list);
router.get('/:id', authorize(PERMISSIONS.CUSTOMERS_READ),   validate({ params: customerIdParamSchema }),   customersController.getOne);
router.post('/',   authorize(PERMISSIONS.CUSTOMERS_CREATE), validate({ body: createCustomerSchema }),      customersController.create);
router.patch('/:id',        authorize(PERMISSIONS.CUSTOMERS_UPDATE), validate({ params: customerIdParamSchema, body: updateCustomerSchema }),       customersController.update);
router.patch('/:id/active', authorize(PERMISSIONS.CUSTOMERS_UPDATE), validate({ params: customerIdParamSchema, body: setCustomerActiveSchema }),    customersController.setActive);
router.delete('/:id',       authorize(PERMISSIONS.CUSTOMERS_DELETE), validate({ params: customerIdParamSchema }),                                   customersController.remove);

export default router;
```

There is no single-segment literal route here, so the `/:id` ordering caveat from `users.routes.ts` line 48 does not apply. Multi-segment children such as Story 09's `/:id/contacts` do not collide with `/:id` either, because they differ in segment count. The caveat returns only if a literal sibling like `/export` is ever added — it would have to be declared **before** `/:id`. Leave a comment saying so, so the next author does not have to rediscover it.

**File: `backend-nodejs/src/routes/v1.ts`** — add the import and one line:

```ts
v1.use('/customers', customersRoutes);
```

---

### 7 — Seed more customers

**File: `backend-nodejs/src/database/seed.ts`** (~lines 203–219)

The existing block seeds exactly one customer, `CUST001`, which is too few to exercise search or pagination. Replace the single-record block with a loop over an array, keeping the same idempotency check (`findOne({ where: { code } })` before insert).

Seed **at least 8** customers, and make them deliberately varied:

- Codes `CUST001`–`CUST008`, matching the `CUST####` generator's format so generated and seeded codes interleave sanely. **`CUST001` must keep its current name and email** so any existing manual test data still matches.
- At least two in `branch2` (Riyadh) so branch scoping is observable exactly as `riyadh.agent@azm.local` demonstrates it for users.
- At least one with `isActive: false`.
- At least one with a `null` email and one with a `null` phone, to prove the list screen renders missing values.
- Arabic names that are genuinely different from the English ones (not transliterations), so a search for an Arabic substring proves the `fullNameAr` branch of the query is reached.

---

## Frontend Tasks

### 8 — Customer list view

**Create file: `frontend-vuejs/src/views/CustomersView.vue`**

Model it on `UsersView.vue` (346 lines) — same `BaseCard` header slot, same loading / error / empty / table branching, same `messageFor()` helper. Differences:

**Search and filter bar**, above the table:

```vue
<div class="filters">
  <BaseInput v-model="search" type="search" :label="t('customers.search')" />
  <label class="select-field">
    <span>{{ t('customers.columns.status') }}</span>
    <select v-model="statusFilter">
      <option value="">{{ t('customers.filter.all') }}</option>
      <option value="true">{{ t('customers.status.active') }}</option>
      <option value="false">{{ t('customers.status.inactive') }}</option>
    </select>
  </label>
</div>
```

**Debounce the search.** Typing must not fire a request per keystroke:

```ts
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, () => {
  clearTimeout(searchTimer)
  // Any new search starts from the first page; staying on page 4 of the old
  // result set would show an empty table for a narrower query.
  page.value = 1
  searchTimer = setTimeout(loadCustomers, 300)
})

watch([statusFilter, page], loadCustomers)

onUnmounted(() => clearTimeout(searchTimer))
```

**Guard against out-of-order responses.** A slow request for `"a"` must not overwrite the results for `"ahmed"`:

```ts
let requestSeq = 0

async function loadCustomers() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value) params.set('isActive', statusFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))

    const response = await api.get(`/customers?${params}`)
    if (seq !== requestSeq) return          // a newer request already answered
    customers.value = response.data.items
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}
```

**Table columns:** code (monospace, inside `<bdi>`), name (via `useLocalizedName` over `{ nameEn: row.fullNameEn, nameAr: row.fullNameAr }` — the same shim `UsersView.vue` uses at ~lines 167–169), email, phone, status badge, actions.

Wrap `email` and `phone` in `<bdi>` — a `+9665…` phone number rendered inside an Arabic paragraph reorders visually without it.

**Pagination controls** below the table: previous / next buttons disabled at the boundaries, and a "showing X–Y of Z" line using `formatNumber` from `useFormat` so the digits localize.

**Create form:** `fullNameEn`, `fullNameAr`, `email`, `phone`, a `preferredLanguage` select, and an **optional** `code` field whose placeholder states it is generated when left blank. Submit with `branchId: auth.user!.branchId`, matching how `UsersView.vue` supplies the branch at ~lines 221–226.

Show the create button only under `auth.can('customers.create')`, the activate/deactivate action under `auth.can('customers.update')`, and delete under `auth.can('customers.delete')`. Deleting must ask for confirmation first.

### 9 — Route and navigation

**File: `frontend-vuejs/src/router/index.ts`** — add inside the `AppLayout` children array (~lines 25–50):

```ts
{
  path: 'customers',
  name: 'customers',
  component: () => import('@/views/CustomersView.vue'),
  meta: { titleKey: 'nav.customers', permission: 'customers.read' },
},
```

**File: `frontend-vuejs/src/components/layout/AppSidebar.vue`** — add to `navItems` (~lines 45–50), between `dashboard` and `users`:

```ts
{ name: 'customers', titleKey: 'nav.customers', icon: '🧾', permission: 'customers.read' },
```

### 10 — Translations

Add to **both** `frontend-vuejs/src/i18n/locales/en.json` and `ar.json`. `locale-parity.spec.ts` fails the build if a key exists in one file and not the other.

Add `nav.customers` and a `customers` namespace covering: `title`, `search`, `addCustomer`, `generatedCode`, `confirmDelete`, `showing`, `previous`, `next`, `columns` (`code`, `name`, `nameEn`, `nameAr`, `email`, `phone`, `language`, `status`, `actions`), `status` (`active`, `inactive`), `filter.all`, `empty` (`title`, `description`), `noResults` (`title`, `description` — distinct from `empty`; "no customers exist" and "your search matched nothing" are different situations and must read differently), and `errors.codeTaken`.

---

## Edge Cases & Failure Modes

- **Search term containing `%`, `_`, or `[`** — a raw term would become a wildcard and match every row. Escaped in `listCustomers` in `customers.service.ts` before binding, by wrapping each metacharacter in brackets. Test with a literal `%`.
- **Arabic search text** — the `Arabic_CI_AS` collation makes `LIKE` case-insensitive for both scripts. Because parameters bind as `nvarchar`, no `N'…'` prefix is needed. A regression here shows up as zero results for an Arabic substring that visibly exists; covered by a seeded Arabic-only name.
- **Soft-deleted customer holds its code** — the `UNIQUE` constraint on `Customers.code` does not ignore soft-deleted rows, so re-creating a deleted customer with the same code fails at the database. Both the uniqueness check and `generateCode` use `.withDeleted()` so the conflict surfaces as a clean **409**, not a driver error.
- **`generateCode` under concurrency** — two simultaneous creates can read the same maximum and derive the same code; the second insert then violates the unique constraint and surfaces as a 500. Acceptable at this scale, and the client can retry. **Documented as a known limitation** — a proper sequence table is a follow-up. Do not paper over it with a silent retry loop that could mask a real conflict.
- **Non-Administrator supplies another branch's `branchId` in the list query** — the value is overwritten, not rejected, in `customers.controller.ts` `list`. The caller sees their own branch. This matches `users.controller.ts` ~lines 28–31 and is the behaviour the users tests already pin.
- **Non-Administrator fetches a customer in another branch by id** — 403 `ForbiddenError`, not 404. This does leak existence; it is the identical trade-off already made in `users.controller.ts` `getOne` (~lines 44–46), and consistency matters more than the marginal disclosure.
- **`page` beyond the last page** — returns an empty `items` array with the true `total`. The view must render the "no results" state, not an error, and the pagination control must not offer a next page.
- **`pageSize` above 100** — Zod rejects with 422 at the schema, and `listCustomers` clamps defensively as well. Both layers are deliberate: the schema gives a clear client error, the clamp protects any internal caller.
- **`email` set to `null` explicitly vs omitted** — `null` clears the column; omission leaves it untouched. This is why the schema uses `.nullish()` rather than `.optional()`.
- **Deleting a customer that has tickets** — the soft delete succeeds and `Tickets.customerId` still points at the row. Ticket screens joining `Customers` must use `withDeleted()` or they will lose the customer name. Flag this for Story 10, which builds the interaction history.
- **A deactivated customer** remains visible with the `isActive=false` filter and keeps all tickets. Only `deletedAt` hides a row from normal reads.
- **New permission codes not seeded** — every customer route returns 403 despite correct code. The fix is `npm run db:seed`; the README troubleshooting table already carries this row for `permissions.constants.ts` changes.

---

## Test Plan

Backend unit tests need no database — follow `backend-nodejs/src/modules/users/__tests__/permissions.constants.spec.ts` for pure-logic tests and `password.spec.ts` for the service-shape style.

1. **`backend-nodejs/src/modules/customers/__tests__/customers.schemas.spec.ts`** (new, unit)
   - `createCustomerSchema` accepts a payload with `code` omitted.
   - Rejects `fullNameEn: ''` and a `fullNameAr` over 200 characters.
   - Accepts `email: null`; rejects `email: 'not-an-email'`.
   - `preferredLanguage` accepts `'en'`/`'ar'` and rejects `'fr'`.
   - `updateCustomerSchema` rejects `{}` with the "At least one field" message.
   - `listCustomersQuerySchema` coerces `page: '2'` to the number `2`, transforms `isActive: 'false'` to `false`, and rejects `pageSize: '500'`.

2. **`backend-nodejs/src/modules/customers/__tests__/customers.search.spec.ts`** (new, unit)
   - Export the LIKE-escaping helper from `customers.service.ts` (or extract it into a small exported function) and assert `%`, `_`, and `[` are each bracketed.
   - Assert a plain term is unchanged apart from the surrounding `%`.

3. **`backend-nodejs/src/modules/users/__tests__/permissions.constants.spec.ts`** (**modify**)
   - Extend the existing catalogue-completeness assertion so it covers the four new codes.
   - Add: the `CUSTOMER` role holds **no** `customers.*` permission.
   - Add: `ADMIN` holds all four.
   - Add: `AGENT` holds `customers.create` but **not** `customers.delete`.

4. **`backend-nodejs/src/modules/customers/__tests__/customers.itest.ts`** (new, **integration** — `.itest.ts`, so it runs under `npm run test:integration` and skips off-Windows like `database.itest.ts`)
   - Create → returns 201 and a generated `CUST####` code.
   - Create with an explicit duplicate code → 409.
   - List with `q` matching an English name → the seeded row is present.
   - List with `q` matching an **Arabic** name → the seeded row is present.
   - List with `q` = `'%'` → does **not** return every row.
   - List with `pageSize: 2` → `items.length === 2` and `total` reflects the unpaged count.
   - Update changes the name; a second read reflects it.
   - `PATCH /:id/active` with `false` → the row disappears from an `isActive=true` listing.
   - `DELETE /:id` → 204, then `GET /:id` → 404.
   - Manager token listing → only their branch appears; the Riyadh-seeded customer is absent.
   - Agent token calling `DELETE` → 403.

5. **`frontend-vuejs/src/views/__tests__/CustomersView.spec.ts`** (new)
   - Follow the mocking style of `LoginView.spec.ts`: `vi.mock('vue-router', …)`, a fresh Pinia per test, and the `i18n` plugin.
   - Renders one table row per returned customer.
   - Renders the **empty** state when the API returns zero customers and no search term is set.
   - Renders the **no results** state when a search term is set and zero come back — asserting the two states use different text.
   - Typing in the search box issues **one** request after the debounce elapses, not one per keystroke (drive with `vi.useFakeTimers()`).
   - Changing the search resets `page` to 1.
   - A stale in-flight response does not overwrite newer results — resolve two mocked calls out of order and assert the newest wins.
   - The create button is hidden without `customers.create`.
   - Delete asks for confirmation before calling the API.

6. **`frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts`** — no edit needed; it must simply still pass, which proves every new key was added to both catalogues.

---

## Migration / Rollback

- **Apply:** `npm run migration:run` in `backend-nodejs`. It adds one column and one index; it does not rewrite existing rows beyond the `DEFAULT 1` backfill.
- **Rollback:** `npm run migration:revert` drops the index, the named default constraint, and the column, in that order. The named constraint is what makes this reversible — verify it exists before relying on revert.
- **Half-applied state:** if the process dies between the `ALTER TABLE` and the `CREATE INDEX`, re-running `migration:run` fails because the column already exists. Recover by dropping the column manually, then re-running. The migration is not internally transactional.
- **Seed:** `npm run db:seed` must run after `migration:run`, both to write the new permission rows and to add the extra demo customers. It is idempotent — every insert is guarded by a `findOne` check.
- **Order matters:** seeding before migrating fails, because `isActive` does not yet exist on `Customers`.

---

## Verification Steps

1. **Migration applies:** in `backend-nodejs`, `npm run migration:run` → completes without error.
2. **Seed re-applies:** `npm run db:seed` → logs the new permission rows and the added customers; running it a second time inserts nothing new.
3. **Backend unit tests pass:** `npm test` in `backend-nodejs`.
4. **Backend integration tests pass:** `npm run test:integration` in `backend-nodejs` (Windows, database required).
5. **Backend builds:** `npm run build` in `backend-nodejs` → exits 0 and produces `dist/server.js`. Test files must not appear in `dist/`.
6. **Frontend tests pass:** `npm test` in `frontend-vuejs` — including `locale-parity.spec.ts`.
7. **Frontend builds:** `npm run build` in `frontend-vuejs` → type-check and Vite build both clean.
8. **Manual — search:** sign in as `admin@azm.local` / `Passw0rd!`, open **Customers**, type an Arabic fragment of a seeded name → the matching row appears. Type `%` → the list does **not** show everything.
9. **Manual — scoping:** sign in as `manager@azm.local` → the Riyadh-seeded customers are absent from the list.
10. **Manual — permissions:** sign in as `agent@azm.local` → the Customers link is visible and the create form works, but no delete action is offered.
11. **Manual — customer role:** sign in as `customer@azm.local` → **no** Customers link in the sidebar, and navigating directly to `/customers` redirects to the dashboard.
12. **Swagger:** `http://localhost:3000/api/docs` lists all six `/customers` paths under a **Customers** tag.
13. **Regression:** `/users` and `/users/roles` still behave as Story 07 left them; sign-in, sign-out, and language switching are unaffected.

---

## Done Criteria

- [ ] Migration `1757000000000-CustomerManagement.ts` adds `isActive` with a **named** default constraint and a `(branchId, isActive)` index, and its `down()` reverses all three steps.
- [ ] `Customer` entity gains `isActive`; no other existing column is altered.
- [ ] Four `customers.*` permissions exist in `PERMISSIONS`, `PERMISSION_CATALOGUE`, and `ROLE_PERMISSION_MAP`, with the `CUSTOMER` role holding none of them.
- [ ] `customers.service.ts` exports `listCustomers`, `findById`, `createCustomer`, `updateCustomer`, `setCustomerActive`, `softDeleteCustomer`, and `toPublicCustomer`.
- [ ] Customer codes are generated as `CUST####` when omitted, and a supplied duplicate returns **409**.
- [ ] LIKE metacharacters in the search term are escaped before binding.
- [ ] Listing is paginated, returns `{ items, total, page, pageSize }`, defaults to 20 per page, and caps at 100.
- [ ] Search matches `fullNameEn`, `fullNameAr`, `code`, `email`, and `phone`.
- [ ] Non-Administrators are confined to their own branch on list, get, create, update, activate, and delete.
- [ ] All six routes are registered under `/api/v1/customers`, permission-gated, and documented with `@openapi` blocks.
- [ ] `DELETE` soft-deletes and returns 204; the row then 404s on read but keeps its ticket references intact.
- [ ] The seed creates at least 8 varied customers across both branches, including one inactive and one with a null email, and remains idempotent.
- [ ] `CustomersView.vue` lists, searches with a 300 ms debounce, filters by status, paginates, creates, activates/deactivates, and deletes with confirmation.
- [ ] Search input resets to page 1, and a stale response cannot overwrite a newer one.
- [ ] Empty and no-results states are visually and textually distinct.
- [ ] The route and sidebar entry are gated on `customers.read`.
- [ ] All new UI strings exist in **both** `en.json` and `ar.json`, and `locale-parity.spec.ts` passes.
- [ ] Backend and frontend unit tests, integration tests, and both builds pass.
- [ ] Stories 01–07 show no regressions.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 09.**
