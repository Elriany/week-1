# Story 15 — CRM Foundation: Channel, Customer Account Link & Audit Log (Story: 27)

## Prerequisites

- **Story 07 completed** ([../user-management/07-story-authentication-and-authorization-16.md](../user-management/07-story-authentication-and-authorization-16.md)) — `authenticate` / `authorize`, the `AuthContext` shape, and `PERMISSION_CATALOGUE` / `ROLE_PERMISSION_MAP`.
- **Story 11 completed** ([../ticket/11-story-ticket-data-model-creation-and-search-18.md](../ticket/11-story-ticket-data-model-creation-and-search-18.md)) — `Tickets`, `ticket.constants.ts`, `tickets.service.ts`, and the migration timestamp discipline.
- **Story 12 completed** ([../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md](../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md)) — `TicketHistory`, `recordHistory`, `transitionTicket`, `assignTicket`. This story writes **beside** that trail, not instead of it.
- **Story 13 completed** ([../ticket/13-story-ticket-notes-and-attachments-18.md](../ticket/13-story-ticket-notes-and-attachments-18.md)) — `common/uploads/attachments.upload.ts` exists at its shared path.

**This story is backend-only.** It is the shared-contract story for the whole `completion` feature: **every permission code, the channel value, the `Users → Customers` link, and the audit service used by Stories 16–23 are introduced here and nowhere else.** Do not add a permission code in a later story.

---

## Story Goal

Lay the three foundations the rest of US13 needs, and unblock the integration suite:

1. **Fix the broken `app` import** so `npm run test:integration` can run at all.
2. **A communication channel on every ticket** — a `channel` column plus an extensible `TICKET_CHANNELS` catalogue whose only settable member is `WEB`. No email, SMS, WhatsApp, or live-chat provider.
3. **A link from a login account to a customer record** — `Users.customerId`, nullable, so a `CUSTOMER`-role user can be resolved to the `Customers` row whose tickets they own.
4. **A lightweight audit log** — one `AuditLogs` table recording actor, action, entity, timestamp, and a small JSON detail blob, written from a single `audit.service.ts`.
5. **The complete permission catalogue for US13**, added once, seeded once.

**Not in scope:**
- SLA fields and calculation → Story 16.
- Knowledge Base tables → Story 17.
- Customer portal endpoints → Story 18.
- Dashboards and reports → Story 19.
- Administration endpoints → Story 20.
- Any frontend change → Stories 21–23.
- Email, SMS, WhatsApp, live chat, queues, or any external provider. **The channel is a stored string, not a transport.**

---

## Context — Read These Files First

1. `backend-nodejs/src/app.ts` — the whole file (66 lines). **Line 66 is `export default app;` and there is no named export.** Every integration test imports `{ app }` (see the grep below), so `supertest(app)` receives `undefined` and the suite cannot run. Task 1 fixes this.
2. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — the whole file (79 lines). Note the `@Index` stack (~lines 12–20) and that `categoryId` (~lines 73–78) is the precedent for adding a **nullable** column with an FK. `channel` is added next to `description` (~lines 67–71).
3. `backend-nodejs/src/modules/tickets/ticket.constants.ts` — the whole file (70 lines). `TICKET_STATUS_CODES` / `TICKET_STATUS_CATALOGUE` (~lines 6–29) is the exact shape `TICKET_CHANNELS` copies. `TICKET_HISTORY_ACTIONS` (~lines 62–70) shows how an action enum is declared here.
4. `backend-nodejs/src/modules/users/user.entity.ts` — the whole file (54 lines). `branchId` / `departmentId` / `roleId` are **not null**; `passwordHash` (~lines 49–50) is `select: false`. The new `customerId` is **nullable** and mirrors the `roleId` `@ManyToOne` + `@JoinColumn` shape (~lines 28–33).
5. `backend-nodejs/src/modules/customers/customer.entity.ts` — the whole file (36 lines). **There is currently no path from a `User` to a `Customer`.** That is the gap this story closes.
6. `backend-nodejs/src/modules/users/permissions.constants.ts` — the whole file (88 lines). `PERMISSIONS` (~lines 6–20), `PERMISSION_CATALOGUE` (~lines 24–38), `ROLE_CODES` (~lines 40–46), `ROLE_PERMISSION_MAP` (~lines 51–88). Note `CUSTOMER` currently holds **only** `tickets.read` (~lines 85–87).
7. `backend-nodejs/src/modules/tickets/ticketHistory.entity.ts` — the whole file (47 lines). The `AuditLog` entity is its sibling: same `BaseEntity`, same actor join, but **not** scoped to a ticket.
8. `backend-nodejs/src/modules/tickets/ticketHistory.service.ts` — `recordHistory` (~lines 80–92). **It takes an `EntityManager` and never opens its own transaction.** `recordAudit` follows the same contract, plus a fire-and-forget variant for call sites with no enclosing transaction. The explicit actor `.select([...])` (~lines 112–121) is the rule for every user join in this story.
9. `backend-nodejs/src/modules/tickets/tickets.service.ts` — `createTicket` (~lines 122–160), `transitionTicket` (~lines 263–319), `assignTicket` (~lines 330–446). These three are where audit rows get written. `CreateTicketInput` (~lines 30–38) and `toPublicTicket` (~lines 71–99) both gain `channel`.
10. `backend-nodejs/src/database/migrations/1762000000000-TicketAttachments.ts` — the whole file (30 lines). The **exact migration style** to copy: bracketed identifiers, `uniqueidentifier … DEFAULT NEWID()`, `datetime2 … DEFAULT GETDATE()`, named FK constraints, an explicit `CREATE INDEX`, and a `down()` that drops the table.
11. `backend-nodejs/src/database/migrations/1760000000000-TicketManagement.ts` — ~lines 19–24. The pattern for `ALTER TABLE … ADD` plus a named FK constraint plus an index, all in one `up()`.
12. `backend-nodejs/src/database/seed.ts` — ~lines 39–115 (reference data and the permission/role re-apply loop), ~lines 184–189 (the six demo users, including `customer@azm.local` with `ROLE_CODES.CUSTOMER`), ~lines 216–223 (the eight demo customers, `CUST001`–`CUST008`). Task 8 links the demo customer account to `CUST001`.
13. `backend-nodejs/src/config/data-source.ts` — ~lines 19–20. Entities and migrations are picked up by **glob**; a new `*.entity.ts` under `src/modules/**` registers itself, but `src/common/**` is **not** currently matched.
14. `backend-nodejs/vitest.config.ts` — ~lines 14–37. `unit` matches `*.spec.ts`, `integration` matches `*.itest.ts` with `fileParallelism: false`.

Grep targets:
- Grep for `from '../../../app'` in `backend-nodejs/src/` — seven `.itest.ts` files import `{ app }`. Confirm the count before and after task 1.
- Grep for `recordHistory(` in `backend-nodejs/src/modules/tickets/` — every existing audit-write site, so you can see which ones also deserve an `AuditLogs` row.
- Grep for `ROLE_CODES.CUSTOMER` in `backend-nodejs/src/` — every place the customer role is already special-cased (`tickets.service.ts` ~line 382, `tickets.controller.ts` ~line 210, `ticketChildren.controller.ts` ~line 43).

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Channel** | Every ticket stores a channel string. Existing rows are backfilled to `WEB`. The column is **not null with a DB default** so no caller is forced to supply it. |
| **Channel extensibility** | `TICKET_CHANNELS` lists `WEB`, `PHONE`, and `EMAIL` as *values*; only `WEB` is produced by any flow in this feature. Adding a real transport later means adding an intake service, never a schema change. |
| **Customer link** | `Users.customerId` is **nullable**. Staff accounts leave it null. A `CUSTOMER`-role account without it can read nothing in the portal — **fail closed**, never fall back to "all tickets". |
| **One customer per account** | A `Customers` row may back at most one login account. Enforced by a **filtered unique index** so the many nulls on staff rows stay legal. |
| **Audit vs history** | `TicketHistory` remains the ticket-scoped, user-facing timeline. `AuditLogs` is the cross-module, staff-facing record. A ticket status change writes **both** — they serve different readers and are read by different screens. |
| **Audit is never the reason a request fails** | Inside a transaction, an audit write rolls back with its subject. Outside one, `recordAuditSafe` swallows and logs its own failure. A broken log must not break the CRM. |
| **Audit payload** | `actorUserId`, `action`, `entityType`, `entityId`, `summary`, optional `details` JSON capped at 2000 chars. **Never** a whole entity, and never anything from `Users` beyond the id. |
| **Permissions** | All six new codes land in this story. `CUSTOMER` gains `tickets.create` and `kb.read` — nothing else. |

---

## Backend Tasks

### 1 — Unblock the integration suite

**File: `backend-nodejs/src/app.ts`**

The file ends with `export default app;` (line 66). Seven integration suites import it as a **named** export:

```
src/modules/customers/__tests__/customerContacts.itest.ts:4
src/modules/customers/__tests__/customerNotes.itest.ts:4
src/modules/customers/__tests__/customers.itest.ts:4
src/modules/tickets/__tests__/ticketAssignment.itest.ts:4
src/modules/tickets/__tests__/ticketHistory.itest.ts:4
src/modules/tickets/__tests__/ticketLifecycle.itest.ts:4
src/modules/tickets/__tests__/tickets.itest.ts:4
```

Add a named export **alongside** the default so both forms resolve. Replace line 66 with:

```ts
// Both forms are exported deliberately: `server.ts` imports the default, and the
// integration suites import `{ app }`. Removing either breaks one of them.
export { app };
export default app;
```

**Do not** edit the seven test files instead — the named export is one line, and those suites are the contract Stories 16–20 extend.

### 2 — Channel catalogue

**File: `backend-nodejs/src/modules/tickets/ticket.constants.ts`**

Append after `TICKET_CATEGORY_CATALOGUE` (~line 37):

```ts
/**
 * How a ticket reached the CRM. Only WEB is produced by any flow in this
 * feature — PHONE and EMAIL exist so an agent-entered or future ingested ticket
 * has a value to carry, not because any transport is implemented. Adding a real
 * channel means adding an intake service; this list does not change.
 */
export const TICKET_CHANNELS = {
  WEB: 'WEB',
  PHONE: 'PHONE',
  EMAIL: 'EMAIL',
} as const;

export type TicketChannel = (typeof TICKET_CHANNELS)[keyof typeof TICKET_CHANNELS];

export const DEFAULT_TICKET_CHANNEL: TicketChannel = TICKET_CHANNELS.WEB;
```

### 3 — Entities

**File: `backend-nodejs/src/modules/tickets/ticket.entity.ts`**

Add `@Index(['channel'])` to the index stack (~lines 12–20) and this column after `description` (~line 71):

```ts
/**
 * How the ticket arrived. Not null with a DB default so every existing row and
 * every caller that predates this column keeps working. See TICKET_CHANNELS.
 */
@Column({ type: 'nvarchar', length: 30, default: 'WEB' })
channel!: TicketChannel;
```

Import `TicketChannel` from `./ticket.constants`.

**File: `backend-nodejs/src/modules/users/user.entity.ts`**

Add `@Index(['customerId'])` and, after the `role` relation (~line 33):

```ts
/**
 * Links a CUSTOMER-role login to the Customers row whose tickets it owns.
 * NULL for every staff account. A CUSTOMER-role account with a NULL value can
 * reach nothing in the portal — that is deliberate; see Story 18.
 */
@Column({ type: 'uniqueidentifier', nullable: true })
customerId?: string | null;

@ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
@JoinColumn({ name: 'customerId' })
customer?: Customer | null;
```

Import `Customer` from `../customers/customer.entity`. **This creates a `users → customers` import edge that did not exist.** `customer.entity.ts` imports only `Branch`, so there is no cycle — keep it that way and **do not** add a back-reference on `Customer`.

**Create file: `backend-nodejs/src/common/audit/auditLog.entity.ts`**

```ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { User } from '../../modules/users/user.entity';
import type { AuditAction, AuditEntityType } from './audit.constants';

/**
 * Cross-module action record. Deliberately has no retention policy in this
 * scope; the [createdAt] index keeps date-ranged reads cheap as it grows.
 */
@Entity('AuditLogs')
@Index(['actorUserId'])
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  actorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser?: User;

  @Column({ type: 'nvarchar', length: 60 })
  action!: AuditAction;

  @Column({ type: 'nvarchar', length: 60 })
  entityType!: AuditEntityType;

  /** Nullable: a configuration action may not name a single row. */
  @Column({ type: 'uniqueidentifier', nullable: true })
  entityId?: string | null;

  /** Human-readable one-liner, already resolved to names rather than ids. */
  @Column({ type: 'nvarchar', length: 500 })
  summary!: string;

  /** JSON string, capped at AUDIT_DETAILS_MAX by the service. Never a whole entity. */
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  details?: string | null;
}
```

**File: `backend-nodejs/src/config/data-source.ts`**

The glob at ~line 19 matches `src/modules/**` only, so the new entity would never register. Widen it in the same edit:

```ts
entities: [
  __dirname + '/../modules/**/*.entity.{ts,js}',
  __dirname + '/../common/**/*.entity.{ts,js}',
],
```

Before making this change, read `backend-nodejs/src/common/entities/BaseEntity.ts` (14 lines) and confirm it is `abstract` and carries **no** `@Entity()` decorator — that is why widening the glob cannot accidentally create a `BaseEntity` table.

### 4 — Audit constants

**Create file: `backend-nodejs/src/common/audit/audit.constants.ts`**

```ts
/** What happened. One flat list across every module — the log is cross-cutting. */
export const AUDIT_ACTIONS = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_STATUS_CHANGED: 'TICKET_STATUS_CHANGED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_UNASSIGNED: 'TICKET_UNASSIGNED',
  TICKET_PRIORITY_CHANGED: 'TICKET_PRIORITY_CHANGED',
  CONFIG_CREATED: 'CONFIG_CREATED',
  CONFIG_UPDATED: 'CONFIG_UPDATED',
  CONFIG_DEACTIVATED: 'CONFIG_DEACTIVATED',
  KB_ARTICLE_PUBLISHED: 'KB_ARTICLE_PUBLISHED',
  KB_ARTICLE_UNPUBLISHED: 'KB_ARTICLE_UNPUBLISHED',
  SLA_POLICY_UPDATED: 'SLA_POLICY_UPDATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  TICKET: 'Ticket',
  BRANCH: 'Branch',
  DEPARTMENT: 'Department',
  TICKET_CATEGORY: 'TicketCategory',
  TICKET_PRIORITY: 'TicketPriority',
  TICKET_STATUS: 'TicketStatus',
  KB_ARTICLE: 'KbArticle',
  KB_CATEGORY: 'KbCategory',
  SLA_POLICY: 'SlaPolicy',
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

/** Details are truncated, not rejected — a long payload must not fail the action. */
export const AUDIT_DETAILS_MAX = 2000;
```

Stories 16, 17, and 20 consume these constants and **add no new ones** unless their own plan says so explicitly.

### 5 — Audit service

**Create file: `backend-nodejs/src/common/audit/audit.service.ts`**

Mirror `ticketHistory.service.ts` (~lines 80–92) in shape. Exported types:

```ts
export interface RecordAuditInput {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  details?: unknown;
}

export interface PublicAuditEntry {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  summary: string;
  details: unknown;
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null;
  createdAt: Date;
}

export interface ListAuditFilter {
  entityType?: AuditEntityType;
  entityId?: string;
  actorUserId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface PagedAudit {
  items: PublicAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}
```

Four exported functions:

- **`recordAudit(manager: EntityManager, input: RecordAuditInput): Promise<void>`** — writes through the passed manager and never opens its own transaction. `details` is `JSON.stringify`'d and **truncated** to `AUDIT_DETAILS_MAX`; `undefined` stays `null`.
- **`recordAuditSafe(input: RecordAuditInput): Promise<void>`** — for call sites with no enclosing transaction. Wraps `AppDataSource.transaction(m => recordAudit(m, input))` in a `try/catch` that calls `logger.error('Audit write failed', { … })` and resolves. **This is the only place an audit failure is swallowed, and it is deliberate — say so in the comment.**
- **`listAudit(filter: ListAuditFilter): Promise<PagedAudit>`** — newest first with `.addOrderBy('a.id', 'DESC')` as the tiebreak, real SQL pagination via `skip`/`take`. Copy the `PagedTickets` response shape from `tickets.service.ts` (~lines 64–69) and the page/pageSize clamping from `listTickets` (~lines 163–164).
- **`toPublicAuditEntry(row: AuditLog): PublicAuditEntry`** — parses `details` back inside a `try/catch` that yields `null` on malformed JSON, and projects the actor with an explicit `.select([...])` of `id`, `fullNameEn`, `fullNameAr`. **Never spread a `User`** — it carries `passwordHash`.

### 6 — Wire audit into the existing ticket writes

**File: `backend-nodejs/src/modules/tickets/tickets.service.ts`**

Three edits, each **inside the existing transaction** so the audit row shares the subject's fate:

- `createTicket` (~lines 122–160): the function takes no actor today. Add `actorUserId: string` and `channel?: TicketChannel` to `CreateTicketInput` (~lines 30–38), pass `channel: input.channel ?? DEFAULT_TICKET_CHANNEL` into `manager.create(Ticket, {...})` (~lines 144–155), and write a `TICKET_CREATED` audit row after `manager.save` (~line 157).
- `transitionTicket` (~lines 303–316): next to the existing `recordHistory` call, add `TICKET_STATUS_CHANGED` with `summary: \`${oldStatusCode} → ${toStatus.code}\`` and `details: { ticketNumber, fromStatus, toStatus, note }`.
- `assignTicket` (~lines 410–430): add `TICKET_ASSIGNED` / `TICKET_UNASSIGNED` beside the matching `recordHistory` calls. The **auto-promotion** `STATUS_CHANGED` row (~lines 433–442) also gets its `TICKET_STATUS_CHANGED` audit row — assigning a `NEW` ticket therefore writes **two** history rows and **two** audit rows in one transaction.

Add `channel` to `toPublicTicket` (~lines 71–99).

**Do not** add an audit row to `updateTicket`'s priority branch (~lines 234–249). That block passes `actorUserId: ''` (~line 243), writing a history row with an empty actor FK — a **pre-existing defect that is out of scope here**. Leave a `// TODO (Story 27 follow-up): actorUserId is never populated on this path` comment on that line so the next reader sees it was noticed, not missed.

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

`create` (~lines 89–110) already holds `req.auth!.userId`. Pass it as `actorUserId` into `createTicket` (~line 101) rather than letting the service invent one.

**File: `backend-nodejs/src/modules/tickets/tickets.schemas.ts`**

Add to `createTicketSchema` (~lines 3–11) and to `listTicketsQuerySchema` (~lines 25–39):

```ts
channel: z.enum(['WEB', 'PHONE', 'EMAIL']).optional(),
```

Then add `channel?: TicketChannel` to `ListTicketsFilter` (~lines 48–62) and one more `andWhere` in `listTickets` (~lines 174–181), following the `categoryId` line exactly.

### 7 — Permission catalogue

**File: `backend-nodejs/src/modules/users/permissions.constants.ts`**

Add six codes to `PERMISSIONS` (~lines 6–20) and matching rows to `PERMISSION_CATALOGUE` (~lines 24–38):

| Code | English | Arabic |
|---|---|---|
| `kb.read` | View knowledge base | عرض قاعدة المعرفة |
| `kb.manage` | Manage knowledge base | إدارة قاعدة المعرفة |
| `reports.read` | View reports | عرض التقارير |
| `admin.manage` | Manage CRM configuration | إدارة إعدادات النظام |
| `audit.read` | View audit log | عرض سجل التدقيق |
| `sla.manage` | Manage SLA policies | إدارة اتفاقيات مستوى الخدمة |

Then extend `ROLE_PERMISSION_MAP` (~lines 51–88). `ADMIN` picks all six up automatically from `PERMISSION_CATALOGUE.map` (~line 52) — **do not** list them there.

| Role | Adds |
|---|---|
| `MANAGER` | `kb.read`, `kb.manage`, `reports.read`, `admin.manage`, `audit.read`, `sla.manage` |
| `SUPERVISOR` | `kb.read`, `kb.manage`, `reports.read` |
| `AGENT` | `kb.read` |
| `CUSTOMER` | `tickets.create`, `kb.read` |

**`CUSTOMER` gaining `tickets.create` is what makes the Story 18 web form possible.** It does **not** widen what a customer can see — Story 18 scopes every portal read by `customerId`, and `assignTicket` already refuses a `CUSTOMER`-role assignee (`tickets.service.ts` ~lines 382–384).

Any edit here requires a re-run of `npm run db:seed`; the role loop (~lines 106–112) re-applies the map on every run, so no fresh database is needed.

### 8 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

- After the demo customers block (~lines 216–223), link the demo account: find the `User` with email `customer@azm.local` (~line 188) and the `Customer` with code `CUST001` (~line 216), set `user.customerId`, and save. Guard with `if (!user.customerId)` so re-seeding is idempotent. Log a line matching the existing `logger.info('Seeded …')` style.
- Leave `riyadh.agent@azm.local` and every other staff account with `customerId` null.
- The demo tickets (~lines 385–503) inherit `channel = 'WEB'` from the column default. **Do not** set it explicitly — letting the default apply is the check that the default works.

### 9 — Migration

**Create file: `backend-nodejs/src/database/migrations/1763000000000-CrmFoundation.ts`**

`up()`, in order:

```sql
ALTER TABLE [Tickets] ADD [channel] nvarchar(30) NOT NULL
  CONSTRAINT [DF_Tickets_channel] DEFAULT 'WEB'
CREATE INDEX [IDX_Tickets_channel] ON [Tickets]([channel])

ALTER TABLE [Users] ADD [customerId] uniqueidentifier NULL
ALTER TABLE [Users] ADD CONSTRAINT [FK_Users_customerId]
  FOREIGN KEY ([customerId]) REFERENCES [Customers]([id]) ON DELETE NO ACTION
CREATE UNIQUE INDEX [UX_Users_customerId] ON [Users]([customerId])
  WHERE [customerId] IS NOT NULL
```

The `WHERE … IS NOT NULL` clause is **required**: without it SQL Server treats every staff row's `NULL` as a duplicate and the index creation fails on the second staff user.

Then `CREATE TABLE [AuditLogs]`, copying `1762000000000-TicketAttachments.ts` (~lines 5–24) column-for-column in style: `id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID()`, `actorUserId uniqueidentifier NOT NULL` with `FK_AuditLogs_User → [Users]([id]) ON DELETE NO ACTION`, `action nvarchar(60) NOT NULL`, `entityType nvarchar(60) NOT NULL`, `entityId uniqueidentifier NULL`, `summary nvarchar(500) NOT NULL`, `details nvarchar(2000) NULL`, plus `createdAt` / `updatedAt` `datetime2 NOT NULL DEFAULT GETDATE()` and `deletedAt datetime2 NULL`. Add three indexes: `[actorUserId]`, `([entityType], [entityId])`, `[createdAt]`.

`down()`, in reverse: `DROP TABLE [AuditLogs]`; drop `UX_Users_customerId`, `FK_Users_customerId`, then the `customerId` column; drop `IDX_Tickets_channel`, then `DF_Tickets_channel`, then the `channel` column. **The default constraint must be dropped by name before the column** — SQL Server refuses to drop a column a constraint still references.

---

## Edge Cases & Failure Modes

- **A `CUSTOMER`-role account with `customerId` NULL.** Every portal read in Story 18 returns an empty page and every portal write is refused. Enforced by the nullable column plus Story 18's explicit guard — never by a fallback that shows all tickets. The seed links `customer@azm.local`; a hand-created customer account will not work until an administrator links it, and that is the correct behaviour.
- **Two login accounts pointed at one `Customers` row.** The second write violates `UX_Users_customerId` and surfaces as a 500 from the driver. Task 7 of the work item (administration) is Story 20's problem; here the index is the guarantee that the data can never reach the ambiguous state.
- **The filtered unique index omitted.** Creating the second staff user fails. This is the single most likely migration mistake — the `WHERE [customerId] IS NOT NULL` clause is not optional.
- **Existing tickets with no channel.** The `DEFAULT 'WEB'` on `ALTER TABLE … ADD` backfills every existing row at migration time. Verify with `SELECT COUNT(*) FROM Tickets WHERE channel IS NULL` → `0`.
- **A channel value outside the catalogue.** The column is a plain `nvarchar`; only the Zod enum in `tickets.schemas.ts` constrains it. A direct SQL insert can write anything, and `toPublicTicket` will pass it through. Acceptable for this scope — later screens render an unknown code as the raw string rather than crashing.
- **Audit write fails inside a transaction.** The ticket change rolls back with it. There is no path that commits a status change without its audit row.
- **Audit write fails outside a transaction.** `recordAuditSafe` logs and resolves. A full disk or a dropped connection degrades the log, never the CRM.
- **`details` larger than 2000 chars.** Truncated by the service before the insert, so the write never fails on length. Truncated JSON no longer parses — `toPublicAuditEntry` returns `details: null` for it rather than throwing.
- **A deleted or renamed actor.** `summary` is a copied string, so the line still reads correctly. `actor` comes back `null` when the join is empty, exactly as `toPublicHistoryEntry` handles it (`ticketHistory.service.ts` ~lines 59–65).
- **`AuditLogs` grows without bound.** No retention policy in this scope. The `[createdAt]` index keeps date-ranged reads cheap. State the omission in the entity comment rather than leaving it implied.
- **The widened `common/**` entity glob.** Today it matches only `auditLog.entity.ts`; `BaseEntity.ts` is abstract with no `@Entity()` decorator, so it cannot become a table. Any future `*.entity.ts` placed under `src/common/` will auto-register — that is the intent.
- **The named `app` export.** Adding it cannot break `server.ts`, which imports the default. If the integration suite still fails after the change, the cause is the database connection, not the import — check `MSSQL_SERVER` / `MSSQL_DATABASE` in `src/__tests__/setup.ts` (~lines 6–7).
- **Assigning a `NEW` ticket now writes four rows** (two history, two audit) in one transaction. Tests asserting an exact `TicketHistory` count are unaffected; a test asserting a total across both tables must account for it.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/common/audit/__tests__/audit.constants.spec.ts`.**
   - Every value in `AUDIT_ACTIONS` equals its key; every value in `AUDIT_ENTITY_TYPES` is unique.
   - `AUDIT_DETAILS_MAX` is `2000` and matches the entity column length.
2. **Unit — create `backend-nodejs/src/common/audit/__tests__/audit.service.spec.ts`.**
   - `toPublicAuditEntry` parses a valid `details` string into an object.
   - It returns `details: null` for malformed JSON rather than throwing.
   - It returns `actor: null` when the join came back empty.
   - A 5000-char payload is truncated to exactly `AUDIT_DETAILS_MAX`.
3. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/ticketChannel.spec.ts`.**
   - `TICKET_CHANNELS` contains exactly `WEB`, `PHONE`, `EMAIL`.
   - `DEFAULT_TICKET_CHANNEL` is `WEB`.
   - `createTicketSchema` accepts each channel value, rejects `'SMS'`, and accepts the field being absent.
4. **Unit — extend `backend-nodejs/src/modules/users/__tests__/permissions.constants.spec.ts`.**
   - All six new codes appear in both `PERMISSIONS` and `PERMISSION_CATALOGUE`.
   - `ROLE_PERMISSION_MAP.CUSTOMER` is exactly `['tickets.read', 'tickets.create', 'kb.read']`.
   - `ROLE_PERMISSION_MAP.AGENT` contains `kb.read` and **not** `kb.manage`, `admin.manage`, `reports.read`, `audit.read`, or `sla.manage`.
   - `ADMIN` holds every code in the catalogue — this is what catches a code added to `PERMISSIONS` but forgotten in `PERMISSION_CATALOGUE`.
5. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketChannel.itest.ts`.**
   - `POST /api/v1/tickets` with no `channel` stores `'WEB'`.
   - With `channel: 'PHONE'` stores `'PHONE'`; with `'SMS'` returns **422**.
   - `GET /api/v1/tickets?channel=WEB` filters correctly; `channel=SMS` returns 422.
   - `GET /api/v1/tickets/:id` includes `channel` in the payload.
6. **Integration — create `backend-nodejs/src/common/audit/__tests__/audit.itest.ts`.**
   - Creating a ticket writes exactly one `TICKET_CREATED` row whose `actorUserId` is the caller.
   - A `NEW → IN_PROGRESS` transition writes one `TICKET_STATUS_CHANGED` audit row **and** one `TicketHistory` row.
   - Assigning a `NEW` ticket writes **two** audit rows (`TICKET_ASSIGNED` + `TICKET_STATUS_CHANGED`) and two history rows.
   - A no-op transition writes **no** audit row — same rule as history.
   - A rolled-back transaction leaves no audit row: force a failure after `recordAudit` and assert the count is unchanged.
   - No audit response body contains `passwordHash` — assert on the raw response text.
7. **Integration — create `backend-nodejs/src/modules/users/__tests__/userCustomerLink.itest.ts`.**
   - A staff user saves with `customerId` null.
   - Two users cannot be linked to the same customer — the second save rejects.
   - Three staff users with null `customerId` all save, proving the filtered index.
8. **Regression:** `npm run test:all`. Task 1 makes seven previously-unrunnable suites execute for the first time; **expect real failures there and fix them before declaring this story done.**

---

## Migration / Rollback

- Order: `npm run migration:run`, then `npm run db:seed`. The seed's customer link needs both `Users.customerId` and the demo rows to exist.
- Timestamp `1763000000000` follows `1762000000000-TicketAttachments.ts`. Stories 16, 17, and 20 take `1764`, `1765`, and `1766`. **Do not reuse or reorder.**
- `down()` drops `AuditLogs` **and every row in it, permanently.** Export the table first in any environment whose log matters.
- **Half-applied state:** if `up()` fails after the `channel` column but before `AuditLogs`, the app still starts — `channel` has a default, and `audit.service.ts` is only reached on a write, which will then fail on a missing table. Revert fully and re-run; the statements are written to be safe on a clean revert, not to be individually idempotent.
- Rolling back after Story 16, 17, or 20 is applied is unsupported. Revert in reverse timestamp order.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Backfill confirmed:** against the CRM database, `SELECT COUNT(*) FROM Tickets WHERE channel IS NULL` returns `0`.
4. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Then `SELECT email, customerId FROM Users` — only `customer@azm.local` has a non-null value.
5. **Unit tests:** `npm test` in `backend-nodejs/`.
6. **Integration tests:** `npm run test:integration` in `backend-nodejs/`. **This is the first run in which these suites actually execute.**
7. **Backend runs:** `npm run dev` in `backend-nodejs/`, then with an admin token:
   - `POST /api/v1/tickets` without `channel` → 201, response `channel: "WEB"`.
   - `PATCH /api/v1/tickets/<id>/status` → 200, then `SELECT TOP 5 * FROM AuditLogs ORDER BY createdAt DESC` shows the row.
   - `GET /api/v1/tickets?channel=WEB` → the ticket is listed.
8. **Permission check:** sign in as `customer@azm.local` and call `GET /api/v1/auth/me` — `permissions` contains `tickets.read`, `tickets.create`, and `kb.read`, and nothing else.
9. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `src/app.ts` exports `app` both by name and as the default; all seven `.itest.ts` suites run.
- [ ] `Tickets.channel` exists, is not null, defaults to `WEB`, and every pre-existing row is backfilled.
- [ ] `TICKET_CHANNELS` / `DEFAULT_TICKET_CHANNEL` exist and `createTicketSchema` accepts only those three values.
- [ ] `channel` appears in `CreateTicketInput`, `toPublicTicket`, and `ListTicketsFilter`, and is filterable via `GET /tickets`.
- [ ] `Users.customerId` exists, is nullable, carries an FK to `Customers`, and is covered by a **filtered** unique index.
- [ ] Three or more staff users with null `customerId` coexist.
- [ ] `AuditLogs` exists with the three indexes and is registered through the widened entity glob.
- [ ] `recordAudit` writes only through a caller-supplied `EntityManager`; `recordAuditSafe` is the only place an audit failure is swallowed.
- [ ] Ticket creation, status change, assignment, and unassignment each write an audit row **in the same transaction** as the change.
- [ ] A no-op transition or reassignment writes neither a history nor an audit row.
- [ ] `details` is truncated, never rejected, and malformed JSON reads back as `null`.
- [ ] No audit payload contains `passwordHash`.
- [ ] All six new permission codes exist in `PERMISSIONS` and `PERMISSION_CATALOGUE`, and `ADMIN` holds every catalogue code.
- [ ] `CUSTOMER` holds exactly `tickets.read`, `tickets.create`, `kb.read`.
- [ ] The seed links `customer@azm.local` to `CUST001` and is idempotent across re-runs.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 16.**
