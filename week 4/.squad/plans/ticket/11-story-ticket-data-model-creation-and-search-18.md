# Story 11 — Ticket Data Model, Creation & Search (Story: 18)

## Prerequisites

- **Story 07 completed** ([../user-management/07-story-authentication-and-authorization-16.md](../user-management/07-story-authentication-and-authorization-16.md)) — `authenticate` / `authorize` middleware, the permission catalogue, and branch scoping exist.
- **Story 08 completed** ([../customer-management/08-story-customer-crud-and-search-17.md](../customer-management/08-story-customer-crud-and-search-17.md)) — this story copies its service/controller/routes/schema shape almost line for line. Read it before writing code.
- **The `Tickets`, `TicketStatuses`, `TicketPriorities` and `TicketComments` tables already exist.** Story 02's migration `backend-nodejs/src/database/migrations/1724086800000-InitialCrmSchema.ts` created them (~lines 98–177) and four entities are already mapped to them. **Do not recreate these tables** — this story extends `Tickets` and adds one new table.
- **`Tickets.customerId` already references `Customers.id`** (`backend-nodejs/src/modules/tickets/ticket.entity.ts` ~lines 37–42). `customerHistory.service.ts` already reads that relationship (~lines 28–45); do not break its query.

---

## Story Goal

Turn the dormant ticket tables into a working, queryable resource:

1. **Complete the data model** — add a `TicketCategories` reference table and a **nullable** `categoryId` on `Tickets`.
2. **Align the status catalogue with the lifecycle** the acceptance criteria names: New, Assigned, In Progress, Pending Customer, Resolved, Closed.
3. **Ticket creation** with a **server-generated, unique ticket number**.
4. **Read APIs** — list with search, filtering, sorting and pagination; fetch one by id.
5. **Branch scoping** — non-Administrators only see and create tickets in their own branch.
6. **Permission code** `tickets.assign` added to the catalogue ahead of Story 12.

**Not in scope** (later stories in this feature):
- Status transition rules and the transition endpoint → Story 12.
- Assignment / reassignment and history auditing → Story 12.
- Ticket notes and attachments → Story 13.
- All ticket **screens** → Story 14. This story ships APIs only.
- Deleting tickets. There is no `tickets.delete` permission and no delete endpoint; the lifecycle terminates at **Closed**.
- SLA timers, escalation, email notification.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — the **entire file** (70 lines). Note the eight `@Index` declarations (~lines 11–18), that `assignedUserId` is already **nullable** (~lines 44–49), and that `subject` is `nvarchar(300)` and `description` is `nvarchar(4000)` (~lines 65–69).
2. `backend-nodejs/src/modules/tickets/ticketStatus.entity.ts` — all 18 lines. `code` / `nameEn` / `nameAr` / `sortOrder`. `backend-nodejs/src/modules/tickets/ticketPriority.entity.ts` is the identical shape — the new `TicketCategory` entity copies it.
3. `backend-nodejs/src/database/migrations/1724086800000-InitialCrmSchema.ts` — ~lines 128–159 for the `Tickets` DDL and its eight indexes, and ~lines 98–126 for the reference-table DDL pattern you will copy for `TicketCategories`.
4. `backend-nodejs/src/database/seed.ts` — ~lines 31–46 (`statuses` array) and ~lines 48–62 (`priorities` array). **These are the rows this story changes.** Note the idempotency guard: each loop calls `findOne({ where: { code } })` and only inserts when missing.
5. `backend-nodejs/src/modules/customers/customers.service.ts` — the **whole file** (161 lines). The exact pattern to copy: exported functions not a class; `toPublicCustomer` mapper (~lines 52–66); repository accessor `const customers = () => AppDataSource.getRepository(Customer)` (line 68); `generateCode()` using `.withDeleted()` (~lines 72–84); `listCustomers` with the LIKE-metacharacter escape on line 96 and `getManyAndCount()` on line 108.
6. `backend-nodejs/src/modules/customers/customers.controller.ts` — ~lines 15–43. `isUnscoped()` and how `list` **overrides** `filter.branchId` rather than rejecting. Copy this exactly.
7. `backend-nodejs/src/modules/customers/customers.routes.ts` — ~lines 35–66. `router.use(authenticate)` on line 37, the `@openapi` JSDoc block style (~lines 39–65), and the `authorize(...)` → `validate({...})` → controller middleware order on line 66.
8. `backend-nodejs/src/modules/customers/customers.schemas.ts` — all 37 lines. Zod style, and the `z.enum(['true','false']).transform(v => v === 'true')` idiom for boolean query params (line 30).
9. `backend-nodejs/src/modules/users/permissions.constants.ts` — all 83 lines. `TICKETS_READ` / `TICKETS_CREATE` / `TICKETS_UPDATE` **already exist** (~lines 12–14). New codes go in **three** places: `PERMISSIONS` (~lines 6–19), `PERMISSION_CATALOGUE` (~lines 23–36), and `ROLE_PERMISSION_MAP` (~lines 49–83).
10. `backend-nodejs/src/config/data-source.ts` — line 19. Entities are auto-discovered by the glob `modules/**/*.entity.{ts,js}`; **new entity files need no manual registration**.
11. `backend-nodejs/src/routes/v1.ts` — all 15 lines. One `v1.use(...)` line per module.
12. `backend-nodejs/src/common/entities/BaseEntity.ts` — all 15 lines. Supplies `id`, `createdAt`, `updatedAt`, and the `@DeleteDateColumn` `deletedAt` that makes soft delete work.
13. `backend-nodejs/src/modules/customers/customerHistory.service.ts` — ~lines 28–45. `ticketEntries()` already joins `t.status`. Your changes must keep this compiling.
14. `backend-nodejs/src/modules/customers/__tests__/customers.itest.ts` and `customers.search.spec.ts` — the integration and unit test patterns to mirror.

Grep targets:
- Grep for `TicketStatus` across `backend-nodejs/src/` — confirm the only consumers today are `seed.ts` and `customerHistory.service.ts`.
- Grep for `isUnscoped` in `backend-nodejs/src/modules/` to see every place branch scoping is applied.
- Grep for `'NEW'` and `'OPEN'` across `backend-nodejs/src/` and `frontend-vuejs/src/` before changing status codes.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Ticket number** | Format `TKT-<YYYY>-<NNNNN>`, e.g. `TKT-2026-00001`. **Server-generated only** — the client can never supply or change it. Sequence restarts each calendar year. |
| **Lifecycle codes** | Exactly six: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_CUSTOMER`, `RESOLVED`, `CLOSED`. The legacy `OPEN` and `PENDING` rows are retired by this story. |
| **Creation state** | A new ticket always starts at `NEW` with `assignedUserId` null. The client cannot choose the opening status. |
| **Category** | **Nullable.** A ticket may be filed before it is categorised. Adding the column must not break the existing rows or `customerHistory.service.ts`. |
| **Scope** | Administrators see every branch. Every other role is confined to the branch on their own user record — for listing, fetching, and creating. |
| **Search** | One `q` parameter matches **any** of `ticketNumber`, `subject`, `description` as a case-insensitive substring. |
| **Sorting** | Client chooses `sortBy` ∈ {`createdAt`, `updatedAt`, `ticketNumber`, `priority`} and `sortDir` ∈ {`asc`, `desc`}. Default `createdAt` / `desc` — newest first. |
| **Pagination** | Always applied. Default `pageSize` 20, maximum 100. |
| **Customer role** | The `CUSTOMER` role keeps `tickets.read` only. It gains **no** create, update, or assign permission. |

---

## Backend Tasks

### 1 — Ticket category entity

**Create file: `backend-nodejs/src/modules/tickets/ticketCategory.entity.ts`**

Copy `ticketPriority.entity.ts` exactly, changing only the table and class name.

```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';

@Entity('TicketCategories')
@Index(['code'], { unique: true })
export class TicketCategory extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
```

### 2 — Extend the `Ticket` entity

**File: `backend-nodejs/src/modules/tickets/ticket.entity.ts`**

Add `categoryId` alongside the existing `priorityId` block (~lines 58–63). It must be **nullable** — existing rows have no category.

```ts
  @Column({ type: 'uniqueidentifier', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => TicketCategory, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'categoryId' })
  category?: TicketCategory | null;
```

Add `@Index(['categoryId'])` to the index list (~lines 11–18) and import `TicketCategory` at the top.

### 3 — Migration

**Create file: `backend-nodejs/src/database/migrations/1760000000000-TicketManagement.ts`**

Follow the style of `1757000000000-CustomerManagement.ts` — raw `queryRunner.query`, bracketed identifiers, named constraints, and a real `down()`.

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketManagement1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [TicketCategories] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [sortOrder] int NOT NULL CONSTRAINT [DF_TicketCategories_sortOrder] DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX [IDX_TicketCategories_code] ON [TicketCategories]([code])`);

    await queryRunner.query(`ALTER TABLE [Tickets] ADD [categoryId] uniqueidentifier NULL`);
    await queryRunner.query(`
      ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_categoryId]
      FOREIGN KEY ([categoryId]) REFERENCES [TicketCategories]([id]) ON DELETE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_categoryId] ON [Tickets]([categoryId])`);

    // The list screen filters by status inside a branch; this index serves that query.
    await queryRunner.query(
      `CREATE INDEX [IDX_Tickets_branchId_statusId] ON [Tickets]([branchId], [statusId])`,
    );

    // --- Retire the legacy status codes -------------------------------------
    // Story 02 seeded OPEN and PENDING, which predate the lifecycle in this
    // work item. Remap any ticket that uses them, then remove the rows. Today
    // no tickets exist, so the UPDATEs are a no-op safety net for environments
    // that were seeded and exercised manually.
    await queryRunner.query(`
      INSERT INTO [TicketStatuses] ([code], [nameEn], [nameAr], [sortOrder])
      SELECT v.code, v.nameEn, v.nameAr, v.sortOrder
      FROM (VALUES
        ('ASSIGNED', N'Assigned', N'مُسند', 1),
        ('IN_PROGRESS', N'In Progress', N'قيد التنفيذ', 2),
        ('PENDING_CUSTOMER', N'Pending Customer', N'بانتظار العميل', 3)
      ) AS v(code, nameEn, nameAr, sortOrder)
      WHERE NOT EXISTS (SELECT 1 FROM [TicketStatuses] s WHERE s.[code] = v.code)
    `);

    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'IN_PROGRESS')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'OPEN')
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING_CUSTOMER')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING')
    `);
    await queryRunner.query(`DELETE FROM [TicketStatuses] WHERE [code] IN ('OPEN', 'PENDING')`);

    // Re-sort the survivors so the UI can order by sortOrder alone.
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 0 WHERE [code] = 'NEW'`);
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 4 WHERE [code] = 'RESOLVED'`);
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 5 WHERE [code] = 'CLOSED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO [TicketStatuses] ([code], [nameEn], [nameAr], [sortOrder])
      SELECT v.code, v.nameEn, v.nameAr, v.sortOrder
      FROM (VALUES ('OPEN', N'Open', N'مفتوح', 1), ('PENDING', N'Pending', N'قيد الانتظار', 2))
        AS v(code, nameEn, nameAr, sortOrder)
      WHERE NOT EXISTS (SELECT 1 FROM [TicketStatuses] s WHERE s.[code] = v.code)
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'OPEN')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] IN ('ASSIGNED', 'IN_PROGRESS'))
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING_CUSTOMER')
    `);
    await queryRunner.query(
      `DELETE FROM [TicketStatuses] WHERE [code] IN ('ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER')`,
    );

    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId_statusId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_categoryId] ON [Tickets]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_categoryId]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP COLUMN [categoryId]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketCategories_code] ON [TicketCategories]`);
    await queryRunner.query(`DROP TABLE [TicketCategories]`);
  }
}
```

### 4 — Status catalogue constants

**Create file: `backend-nodejs/src/modules/tickets/ticket.constants.ts`**

The lifecycle graph itself is Story 12's concern; this story only publishes the codes so the seed and the service share one source of truth.

```ts
/**
 * The six lifecycle states from the work item's acceptance criteria, in order.
 * `OPEN` and `PENDING` from the Story 02 seed are retired by migration
 * 1760000000000 and must not reappear here.
 */
export const TICKET_STATUS_CODES = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_CUSTOMER: 'PENDING_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type TicketStatusCode = (typeof TICKET_STATUS_CODES)[keyof typeof TICKET_STATUS_CODES];

export const TICKET_STATUS_CATALOGUE: Array<{
  code: TicketStatusCode; nameEn: string; nameAr: string; sortOrder: number;
}> = [
  { code: 'NEW', nameEn: 'New', nameAr: 'جديد', sortOrder: 0 },
  { code: 'ASSIGNED', nameEn: 'Assigned', nameAr: 'مُسند', sortOrder: 1 },
  { code: 'IN_PROGRESS', nameEn: 'In Progress', nameAr: 'قيد التنفيذ', sortOrder: 2 },
  { code: 'PENDING_CUSTOMER', nameEn: 'Pending Customer', nameAr: 'بانتظار العميل', sortOrder: 3 },
  { code: 'RESOLVED', nameEn: 'Resolved', nameAr: 'تم الحل', sortOrder: 4 },
  { code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق', sortOrder: 5 },
];

export const TICKET_CATEGORY_CATALOGUE = [
  { code: 'TECHNICAL', nameEn: 'Technical Issue', nameAr: 'مشكلة تقنية', sortOrder: 0 },
  { code: 'BILLING', nameEn: 'Billing', nameAr: 'الفوترة', sortOrder: 1 },
  { code: 'ACCOUNT', nameEn: 'Account', nameAr: 'الحساب', sortOrder: 2 },
  { code: 'COMPLAINT', nameEn: 'Complaint', nameAr: 'شكوى', sortOrder: 3 },
  { code: 'GENERAL', nameEn: 'General Enquiry', nameAr: 'استفسار عام', sortOrder: 4 },
];
```

### 5 — Permission code

**File: `backend-nodejs/src/modules/users/permissions.constants.ts`**

`TICKETS_READ`, `TICKETS_CREATE`, and `TICKETS_UPDATE` already exist. Add **one** code in all three places:

- `PERMISSIONS` (~lines 6–19): `TICKETS_ASSIGN: 'tickets.assign',`
- `PERMISSION_CATALOGUE` (~lines 23–36): `{ code: PERMISSIONS.TICKETS_ASSIGN, nameEn: 'Assign tickets', nameAr: 'إسناد التذاكر' },`
- `ROLE_PERMISSION_MAP` (~lines 49–83): add `PERMISSIONS.TICKETS_ASSIGN` to **`MANAGER`** and **`SUPERVISOR`** only. **Do not** add it to `AGENT` (an agent works their own queue but does not route work) and **do not** add it to `CUSTOMER`. `ADMIN` picks it up automatically from `PERMISSION_CATALOGUE`.

Also add `PERMISSIONS.TICKETS_CREATE` to the **`AGENT`** entry — an agent can currently read and update tickets but not raise one, which blocks the Story 14 create form for that role.

**Any edit to this file requires a re-run of `npm run db:seed`.**

### 6 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

1. Replace the inline `statuses` array (~lines 31–46) with `TICKET_STATUS_CATALOGUE` imported from `../modules/tickets/ticket.constants`. Keep the existing idempotency guard loop unchanged.
2. Add an identical loop for `TICKET_CATEGORY_CATALOGUE` into `TicketCategory`.
3. Leave the `priorities` array (~lines 48–62) **untouched** — `LOW`/`MEDIUM`/`HIGH`/`URGENT` already match the requirement.
4. In the demo-data section, seed **six** tickets against the existing seeded customers so Story 14's list screen has something to page and sort. Vary `statusId`, `priorityId`, `categoryId`, `branchId`, and leave `assignedUserId` null on at least two. Use the same "insert only when missing" guard, keyed on `ticketNumber`.

**Note:** the seed's status loop only inserts when a code is missing. It will **not** delete `OPEN`/`PENDING` — that is the migration's job (task 3). Run `npm run migration:run` **before** `npm run db:seed`.

### 7 — Ticket service

**Create file: `backend-nodejs/src/modules/tickets/tickets.service.ts`**

Mirror `customers.service.ts` structure exactly.

```ts
export interface PublicTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  branchId: string;
  departmentId: string;
  customerId: string;
  assignedUserId: string | null;
  status: { id: string; code: string; nameEn: string; nameAr: string } | null;
  priority: { id: string; code: string; nameEn: string; nameAr: string } | null;
  category: { id: string; code: string; nameEn: string; nameAr: string } | null;
  customer: { id: string; code: string; fullNameEn: string; fullNameAr: string } | null;
  assignedUser: { id: string; fullNameEn: string; fullNameAr: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  customerId: string;
  departmentId: string;
  priorityId: string;
  categoryId?: string | null;
  branchId: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priorityId?: string;
  categoryId?: string | null;
  departmentId?: string;
}

export interface ListTicketsFilter {
  q?: string;
  branchId?: string;
  departmentId?: string;
  customerId?: string;
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'ticketNumber' | 'priority';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
```

**`toPublicTicket(t: Ticket): PublicTicket`** — build the nested objects field by field. **Never spread `t.assignedUser` or `t.customer`** — `User` carries `passwordHash`. This is the same rule `customerNotes.service.ts` follows for note authors.

**`generateTicketNumber(): Promise<string>`**

```ts
const TICKET_PREFIX = 'TKT';

async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${TICKET_PREFIX}-${year}-`;

  // withDeleted(): a soft-deleted ticket still occupies its number because the
  // unique index covers every row. Reusing it would collide on insert.
  const row = await tickets()
    .createQueryBuilder('t')
    .withDeleted()
    .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
    .orderBy('t.ticketNumber', 'DESC')
    .getOne();

  const last = row ? Number.parseInt(row.ticketNumber.slice(prefix.length), 10) : 0;
  const next = Number.isNaN(last) ? 1 : last + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
```

Because the number is zero-padded to a fixed width, plain `ticketNumber DESC` ordering is correct within a year — unlike the customer code, no `LEN()` tiebreak is needed.

**`createTicket(input)`** — resolve the `NEW` status id via `TICKET_STATUS_CODES.NEW`, set `assignedUserId: null`, and wrap the insert in a **retry loop of 3 attempts**: two concurrent creates can compute the same number, and the unique index on `ticketNumber` will reject the loser. Catch the duplicate-key failure, regenerate, retry. After 3 failures rethrow as a `ConflictError`.

**`listTickets(filter)`** — `createQueryBuilder('t')` with `leftJoinAndSelect` for `status`, `priority`, `category`, `customer`, and `assignedUser`. Apply each filter with `andWhere`. For `q`, reuse the metacharacter escape from `customers.service.ts` line 96 verbatim:

```ts
const term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
qb.andWhere('(t.ticketNumber LIKE :term OR t.subject LIKE :term OR t.description LIKE :term)', { term });
```

`filter.unassigned === true` maps to `t.assignedUserId IS NULL`.

**Sorting — map the whitelist to a column, never interpolate the raw parameter into SQL:**

```ts
const SORT_COLUMNS: Record<NonNullable<ListTicketsFilter['sortBy']>, string> = {
  createdAt: 't.createdAt',
  updatedAt: 't.updatedAt',
  ticketNumber: 't.ticketNumber',
  priority: 'priority.sortOrder',
};
const column = SORT_COLUMNS[filter.sortBy ?? 'createdAt'];
const dir = filter.sortDir === 'asc' ? 'ASC' : 'DESC';
qb.orderBy(column, dir).addOrderBy('t.id', 'ASC');
```

The `t.id` tiebreak keeps pagination stable when two tickets share a sort value.

**`findById(id)`** — same joins as the list, throws `NotFoundError('Ticket')` when missing.

**`updateTicket(id, input)`** — `Object.assign` then save, exactly like `updateCustomer` (~lines 144–149). **Reject nothing about status here** — status changes go through Story 12's dedicated endpoint, and `UpdateTicketInput` deliberately has no `statusId` or `assignedUserId`.

### 8 — Schemas

**Create file: `backend-nodejs/src/modules/tickets/tickets.schemas.ts`**

```ts
import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  customerId: z.string().uuid(),
  departmentId: z.string().uuid(),
  priorityId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  branchId: z.string().uuid(),
});

export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    priorityId: z.string().uuid().optional(),
    categoryId: z.string().uuid().nullish(),
    departmentId: z.string().uuid().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const ticketIdParamSchema = z.object({ id: z.string().uuid() });

export const listTicketsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  unassigned: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ticketNumber', 'priority']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
```

**`subject` and `description` use `.trim().min(1)`** so a whitespace-only subject is rejected — the same rule `noteBodySchema` applies in `customerChildren.schemas.ts`.

### 9 — Controller

**Create file: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Copy `customers.controller.ts` wholesale, including the `isUnscoped()` helper (~lines 15–17).

- `list` — override `filter.branchId = req.auth!.branchId` when not unscoped (never reject).
- `getOne` — 403 `'This ticket belongs to another branch'` when out of scope.
- `create` — 403 `'You can only create tickets in your own branch'` when `req.body.branchId !== req.auth!.branchId` and not unscoped. Additionally **validate that the referenced customer is in the same branch as the ticket** — call `findById` from `customers.service` and compare `branchId`; throw `ValidationError({ customerId: 'Customer belongs to another branch' })` on mismatch. A ticket filed in Riyadh against an HQ customer is a data-integrity bug the FK cannot catch.
- `update` — load, scope-check, then delegate.

### 10 — Reference-data endpoint

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Add a `meta` handler returning statuses, priorities, and categories in one payload, each ordered by `sortOrder ASC`. Story 14's create form and filter bar need all three to populate dropdowns; three round trips for static reference data is wasteful.

```ts
meta: async (req, res, next) => {
  try {
    const [statuses, priorities, categories] = await Promise.all([
      AppDataSource.getRepository(TicketStatus).find({ order: { sortOrder: 'ASC' } }),
      AppDataSource.getRepository(TicketPriority).find({ order: { sortOrder: 'ASC' } }),
      AppDataSource.getRepository(TicketCategory).find({ order: { sortOrder: 'ASC' } }),
    ]);
    return res.json({ success: true, data: { statuses, priorities, categories }, correlationId: req.id });
  } catch (err) { next(err); }
},
```

### 11 — Routes

**Create file: `backend-nodejs/src/modules/tickets/tickets.routes.ts`**

Copy the header of `customers.routes.ts` (~lines 1–37), including `router.use(authenticate)`. Give every route an `@openapi` JSDoc block in the same style.

| Method | Path | Permission | Validation |
|---|---|---|---|
| `GET` | `/meta` | `TICKETS_READ` | — |
| `GET` | `/` | `TICKETS_READ` | `query: listTicketsQuerySchema` |
| `GET` | `/:id` | `TICKETS_READ` | `params: ticketIdParamSchema` |
| `POST` | `/` | `TICKETS_CREATE` | `body: createTicketSchema` |
| `PATCH` | `/:id` | `TICKETS_UPDATE` | `params: ticketIdParamSchema`, `body: updateTicketSchema` |

**Declare `/meta` before `/:id`.** Express matches in declaration order, so a later `/meta` would be swallowed by `/:id` and then fail uuid validation. `customers.routes.ts` carries the same warning as a comment — repeat it here.

### 9 — Controller

**Create file: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Copy `customers.controller.ts` wholesale, including the `isUnscoped()` helper (~lines 15–17).

- `list` — override `filter.branchId = req.auth!.branchId` when not unscoped (never reject).
- `getOne` — 403 `'This ticket belongs to another branch'` when out of scope.
- `create` — 403 `'You can only create tickets in your own branch'` when `req.body.branchId !== req.auth!.branchId` and not unscoped. Additionally **validate that the referenced customer is in the same branch as the ticket** — call `findById` from `customers.service` and compare `branchId`; throw `ValidationError({ customerId: 'Customer belongs to another branch' })` on mismatch. A ticket filed in Riyadh against an HQ customer is a data-integrity bug the FK cannot catch.
- `update` — load, scope-check, then delegate.

### 10 — Reference-data endpoint

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Add a `meta` handler returning statuses, priorities, and categories in one payload, each ordered by `sortOrder ASC`. Story 14's create form and filter bar need all three to populate dropdowns; three round trips for static reference data is wasteful.

```ts
meta: async (req, res, next) => {
  try {
    const [statuses, priorities, categories] = await Promise.all([
      AppDataSource.getRepository(TicketStatus).find({ order: { sortOrder: 'ASC' } }),
      AppDataSource.getRepository(TicketPriority).find({ order: { sortOrder: 'ASC' } }),
      AppDataSource.getRepository(TicketCategory).find({ order: { sortOrder: 'ASC' } }),
    ]);
    return res.json({ success: true, data: { statuses, priorities, categories }, correlationId: req.id });
  } catch (err) { next(err); }
},
```

### 11 — Routes

**Create file: `backend-nodejs/src/modules/tickets/tickets.routes.ts`**

Copy the header of `customers.routes.ts` (~lines 1–37), including `router.use(authenticate)`. Give every route an `@openapi` JSDoc block in the same style.

| Method | Path | Permission | Validation |
|---|---|---|---|
| `GET` | `/meta` | `TICKETS_READ` | — |
| `GET` | `/` | `TICKETS_READ` | `query: listTicketsQuerySchema` |
| `GET` | `/:id` | `TICKETS_READ` | `params: ticketIdParamSchema` |
| `POST` | `/` | `TICKETS_CREATE` | `body: createTicketSchema` |
| `PATCH` | `/:id` | `TICKETS_UPDATE` | `params: ticketIdParamSchema`, `body: updateTicketSchema` |

**Declare `/meta` before `/:id`.** Express matches in declaration order, so a later `/meta` would be swallowed by `/:id` and then fail uuid validation. `customers.routes.ts` carries the same warning as a comment — repeat it here.

### 12 — Register the module

**File: `backend-nodejs/src/routes/v1.ts`**

```ts
import ticketsRoutes from '../modules/tickets/tickets.routes';
// …
v1.use('/tickets', ticketsRoutes);
```

---

## Frontend Tasks

No frontend changes required. All ticket screens are Story 14.

**One exception —** `frontend-vuejs/src/i18n/locales/en.json` and `ar.json` carry a `ticket.status` block with the keys `NEW`, `OPEN`, `PENDING`, `RESOLVED`, `CLOSED` (~lines 143–151 in both files). Because this story retires `OPEN` and `PENDING`, update both files now so nothing renders a missing key:

- **Remove** `OPEN` and `PENDING`.
- **Add** `ASSIGNED` (`"Assigned"` / `"مُسند"`), `IN_PROGRESS` (`"In Progress"` / `"قيد التنفيذ"`), `PENDING_CUSTOMER` (`"Pending Customer"` / `"بانتظار العميل"`).
- Fix the Arabic `RESOLVED` value: it currently reads `"مغلق"` ("closed") in `ar.json` line 148, duplicating `CLOSED`. It must be `"تم الحل"`.

---

## Edge Cases & Failure Modes

- **Concurrent creation collides on `ticketNumber`.** Two requests read the same maximum and compute the same next number. The unique index (`ticket.entity.ts` line 11, plus `IDX_Tickets_ticketNumber`) rejects the second insert. Handled by the 3-attempt retry loop in `createTicket` (task 7). After 3 failures the request returns 409 rather than a 500.
- **Year rollover.** The first ticket of a new year finds no row matching `TKT-<newyear>-` and restarts at `00001`. Numbers are unique across years because the year is part of the string.
- **Soft-deleted ticket holds its number.** `generateTicketNumber` uses `.withDeleted()`; without it the sequence would reissue a number the unique index still guards, producing a permanent 409.
- **Cross-branch customer on create.** A Riyadh agent files a ticket against an HQ customer. The FK accepts it; the branch check in `tickets.controller.ts` `create` (task 9) rejects it with 400 and `details.customerId`.
- **Ticket created with no category.** `categoryId` is nullable by design. `toPublicTicket` must emit `category: null`, and Story 14's list must render an empty cell, not `undefined`.
- **`OPEN` / `PENDING` rows still referenced.** If a developer created tickets manually before this migration, the `UPDATE` statements in task 3 remap them before the `DELETE`. If the `DELETE` still fails on an FK, a ticket references a status the remap missed — inspect `Tickets.statusId` before retrying rather than forcing the delete.
- **Seed run before migration.** `npm run db:seed` inserts `TICKET_STATUS_CATALOGUE` but cannot create `TicketCategories`; the category loop fails with *Invalid object name*. Always run `npm run migration:run` first. This is the same ordering trap Story 08 hit with the `isActive` column.
- **LIKE metacharacters in `q`.** A search for `50%` or `a_b` would otherwise match far too much. The escape on `customers.service.ts` line 96, copied verbatim, wraps `%`, `_`, and `[` in brackets.
- **`sortBy` injection.** The value reaches `orderBy()`, which does not parameterise identifiers. The Zod `z.enum` plus the `SORT_COLUMNS` lookup (task 7) means an unrecognised value can never reach SQL — it fails validation first and falls back to `createdAt` second.
- **Unstable pagination.** Sorting by `priority` alone puts every `HIGH` ticket in an arbitrary order that can differ between page 1 and page 2, silently dropping or duplicating rows. The `addOrderBy('t.id', 'ASC')` tiebreak fixes it.
- **`passwordHash` leaking through `assignedUser`.** `Ticket.assignedUser` is a full `User`. `toPublicTicket` must project the three safe fields explicitly. Assert this in the integration test.
- **Admin with no branch.** `isUnscoped()` returns true for `ADMIN`, so `req.auth!.branchId` is never read for that role. Any other role always has a branch on their user record.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/tickets.schemas.spec.ts`.** Mirror `customers.schemas.spec.ts`.
   - `createTicketSchema` rejects an empty and a whitespace-only `subject`; rejects `subject` over 300 chars and `description` over 4000.
   - `categoryId` accepts a uuid, `null`, and absence; rejects a non-uuid string.
   - `updateTicketSchema` rejects `{}` with *At least one field must be provided*.
   - `listTicketsQuerySchema` coerces `unassigned: 'true'` to boolean `true`; rejects `sortBy: 'password'`; rejects `pageSize: 500`.
2. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/tickets.numbering.spec.ts`.**
   - Padding: sequence 1 → `TKT-<year>-00001`; 42 → `TKT-<year>-00042`.
   - A malformed stored number (`TKT-2026-XX`) yields `NaN` and falls back to `00001` rather than propagating `NaN`.
   - Zero-padded strings sort correctly with plain lexicographic `DESC` for sequences spanning 9 → 10 and 99 → 100.
3. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/tickets.search.spec.ts`.** Follow `customers.search.spec.ts`.
   - The escape converts `%`, `_`, and `[` into bracketed literals.
   - `SORT_COLUMNS` contains exactly the four whitelisted keys and no key maps to a raw user string.
4. **Unit — modify `backend-nodejs/src/modules/users/__tests__/permissions.constants.spec.ts`.**
   - `tickets.assign` is present in `PERMISSION_CATALOGUE`.
   - `MANAGER` and `SUPERVISOR` hold `tickets.assign`; `AGENT` and `CUSTOMER` do **not**.
   - `AGENT` now holds `tickets.create`.
   - `CUSTOMER` holds `tickets.read` and nothing else ticket-related.
5. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/tickets.itest.ts`.** Follow `customers.itest.ts`.
   - `POST /api/v1/tickets` returns 201, a `ticketNumber` matching `/^TKT-\d{4}-\d{5}$/`, status code `NEW`, and `assignedUserId: null`.
   - Two sequential creates produce consecutive numbers.
   - Creating with a `customerId` from another branch returns 400 with `details.customerId`.
   - A non-admin creating with a foreign `branchId` returns 403.
   - `GET /api/v1/tickets` as a Supervisor returns only their branch's tickets even when `branchId` of another branch is passed explicitly.
   - `q` matches on ticket number, on subject, and on a substring of description.
   - `unassigned=true` returns only tickets with a null `assignedUserId`.
   - `sortBy=ticketNumber&sortDir=asc` returns ascending; `sortBy=priority` orders by `priority.sortOrder`.
   - Paging with `pageSize=2` returns disjoint id sets across pages 1 and 2.
   - `pageSize=500` returns 400.
   - The serialised ticket contains **no** `passwordHash` anywhere — assert on the raw response text.
   - `GET /api/v1/tickets/meta` returns six statuses (codes exactly `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_CUSTOMER`, `RESOLVED`, `CLOSED`), four priorities, and five categories, each ascending by `sortOrder`.
   - A `CUSTOMER`-role token gets 403 on `POST /api/v1/tickets`.
6. **Regression — run the existing customer suites unchanged.** `customerHistory.service.ts` joins `t.status`; adding a column and retiring two status rows must not alter its output.

---

## Migration / Rollback

- **Order is mandatory:** `npm run migration:run` **then** `npm run db:seed`. Reversing them fails on the missing `TicketCategories` table.
- **`down()` is genuinely reversible** for the schema (drops the FK, index, column, and table) and best-effort for the data: it restores the `OPEN` and `PENDING` rows and remaps tickets back. Tickets that were on `ASSIGNED` and `IN_PROGRESS` both collapse to `OPEN` — that mapping is **lossy and cannot be undone**. Do not roll back after real ticket data exists without exporting `Tickets.statusId` first.
- **Half-applied state:** if `up()` fails between the `ALTER TABLE ADD [categoryId]` and the `DELETE FROM [TicketStatuses]`, the column exists while the legacy statuses remain. Re-running `up()` is safe — the status inserts are guarded by `WHERE NOT EXISTS` — but the `ALTER TABLE` is not, so drop the column manually before retrying.
- Migration timestamps are pre-assigned and must stay ordered: `1760000000000` (11) → `1761000000000` (12) → `1762000000000` (13).

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`. Confirm the log ends with *Migrations completed successfully*.
3. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Confirm it logs the three new statuses, five categories, and six demo tickets, and that it does **not** log `OPEN` or `PENDING`.
4. **Unit tests:** `npm test` in `backend-nodejs/`.
5. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
6. **Backend runs:** `npm run dev` in `backend-nodejs/`, then:
   - `GET http://localhost:3000/api/v1/tickets/meta` with an admin bearer token returns six statuses.
   - `POST http://localhost:3000/api/v1/tickets` returns 201 with a `TKT-` number.
   - `GET http://localhost:3000/api/v1/tickets?q=TKT&sortBy=ticketNumber&sortDir=asc&pageSize=2` pages correctly.
7. **Swagger:** open `http://localhost:3000/api-docs` and confirm the five ticket operations appear under the **Tickets** tag.
8. **Regression:** `npm run test:all` in `backend-nodejs/`, and load the customer profile screen to confirm the interaction history still renders ticket entries.

---

## Done Criteria

- [ ] `TicketCategories` table exists with five seeded categories.
- [ ] `Tickets.categoryId` exists, is **nullable**, and is indexed and FK-constrained.
- [ ] `TicketStatuses` contains exactly the six lifecycle codes; `OPEN` and `PENDING` are gone.
- [ ] `ar.json` `ticket.status.RESOLVED` reads `"تم الحل"`, not `"مغلق"`.
- [ ] Creating a ticket returns a unique `TKT-<YYYY>-<NNNNN>` number the client never supplies.
- [ ] A new ticket always opens at `NEW` with `assignedUserId` null.
- [ ] Concurrent creation cannot produce a duplicate ticket number.
- [ ] List supports `q`, filtering by status/priority/category/department/customer/assignee/unassigned, sorting on four whitelisted fields in both directions, and pagination capped at 100.
- [ ] An unrecognised `sortBy` is rejected by validation and can never reach SQL.
- [ ] Non-Administrators cannot list, read, or create tickets outside their branch.
- [ ] A ticket cannot be created against a customer in a different branch.
- [ ] No ticket response contains `passwordHash`.
- [ ] `tickets.assign` exists and is held by Manager, Supervisor, and Administrator only.
- [ ] `GET /api/v1/tickets/meta` serves statuses, priorities, and categories ordered by `sortOrder`.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 12.**
