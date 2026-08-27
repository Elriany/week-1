# Story 12 — Ticket Lifecycle, Assignment & History Auditing (Story: 18)

## Prerequisites

- **Story 11 completed** ([11-story-ticket-data-model-creation-and-search-18.md](11-story-ticket-data-model-creation-and-search-18.md)) — the six lifecycle status codes, `TICKET_STATUS_CODES`, `tickets.service.ts`, `tickets.controller.ts`, `tickets.routes.ts`, and the `tickets.assign` permission all exist. This story appends to those files rather than restructuring them.
- **Story 07 completed** — `authenticate` / `authorize` and the `req.auth` shape (`userId`, `roleCode`, `branchId`, `permissions`).
- **Story 09 completed** ([../customer-management/09-story-customer-contacts-notes-and-profile-17.md](../customer-management/09-story-customer-contacts-notes-and-profile-17.md)) — its `promoteToPrimary` is the **transactional write** precedent this story copies for status transitions.

---

## Story Goal

Make the ticket move through its lifecycle safely and leave an audit trail behind it:

1. **A status transition endpoint** that enforces a fixed transition graph — an invalid jump is rejected, not silently applied.
2. **Assignment and reassignment** of a ticket to a user, and unassignment.
3. **A `TicketHistory` table** that records every status change, assignment change, and priority change with actor, timestamp, and before/after values.
4. **A history read endpoint**, newest-first and paginated.
5. **Auditing is automatic** — writing history is not something a caller can forget or skip.

**Not in scope:**
- Ticket notes and attachments → Story 13.
- All ticket **screens** → Story 14.
- Auditing edits to `subject` / `description`. Only status, assignment, and priority are audited; free-text edits are deliberately excluded to keep the trail readable.
- SLA timers, time-in-status metrics, escalation rules, notifications.
- Reopening a **Closed** ticket. `CLOSED` is terminal in this story's graph.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/tickets.service.ts` (created in Story 11) — the whole file. Note `toPublicTicket`, the repository accessor, and `findById` with its joins. This story adds functions here and in a new sibling service.
2. `backend-nodejs/src/modules/tickets/ticket.constants.ts` (created in Story 11) — `TICKET_STATUS_CODES` and `TICKET_STATUS_CATALOGUE`. The transition graph belongs in this file next to the codes.
3. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — ~lines 44–56. `assignedUserId` is **nullable**; `statusId` is not.
4. `backend-nodejs/src/modules/customers/customerContacts.service.ts` — the `promoteToPrimary` function. This is the **transaction pattern to copy**: `AppDataSource.transaction(async manager => { … })`, all writes through `manager`, and the explicit `deletedAt IS NULL` guard on raw updates because TypeORM's query builder does **not** apply the soft-delete filter to `UPDATE`.
5. `backend-nodejs/src/modules/customers/customerNotes.service.ts` — `listNotes`. Note how the author join uses an explicit `.select([...])` listing only `id`, `fullNameEn`, `fullNameAr`. **Never spread a `User`** — it carries `passwordHash`. Every actor field in this story follows the same rule.
6. `backend-nodejs/src/modules/customers/customerHistory.service.ts` — ~lines 110–126. The `PagedHistory` shape (`items` / `total` / `page` / `pageSize`) and the slice-based pagination. Reuse the same response shape so the frontend has one timeline contract.
7. `backend-nodejs/src/modules/customers/customerChildren.controller.ts` — ~lines 27–33. `requireCustomerInScope` is **exported**; `requireTicketInScope` in this story is its direct analogue.
8. `backend-nodejs/src/modules/users/users.service.ts` — ~lines 41–46 and ~lines 108–119. `ListUsersFilter` and `listUsers`, used to validate that an assignee exists and is active.
9. `backend-nodejs/src/modules/users/permissions.constants.ts` — ~lines 49–83. `tickets.assign` was added by Story 11 to `MANAGER` and `SUPERVISOR`.
10. `backend-nodejs/src/database/migrations/1760000000000-TicketManagement.ts` (created in Story 11) — the migration style and the timestamp ordering this story continues.
11. `backend-nodejs/src/common/errors/AppError.ts` — the exported classes: `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`.

Grep targets:
- Grep for `AppDataSource.transaction` in `backend-nodejs/src/modules/` to find every existing transactional write.
- Grep for `TICKET_STATUS_CODES` to confirm Story 11 landed the constants before starting.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Transition graph** | Fixed and server-enforced. Any pair not in the table below is rejected with 409. |
| **Assignment drives status** | Assigning a ticket that is at `NEW` moves it to `ASSIGNED` in the **same transaction**. Assigning at any other status leaves the status untouched. |
| **Unassignment** | Allowed at any non-terminal status. It does **not** roll the status back to `NEW` — the work already started. |
| **Assignee validity** | The assignee must be an **active** user in the **same branch** as the ticket. Agents, Supervisors, and Managers are assignable; the `CUSTOMER` role is never assignable. |
| **Who may transition** | `tickets.update`. |
| **Who may assign** | `tickets.assign` — Manager, Supervisor, Administrator. An Agent **cannot** reassign a ticket, including their own. |
| **Self-transition** | Setting a ticket to the status it already holds is a no-op that returns 200 and writes **no** history row. |
| **Terminal state** | `CLOSED` accepts no outgoing transition and no assignment change. |
| **Audit completeness** | Every status, assignment, and priority change writes exactly one `TicketHistory` row inside the same transaction as the change. A change that commits without its history row is a defect. |

### Transition graph

| From | Allowed to |
|---|---|
| `NEW` | `ASSIGNED`, `IN_PROGRESS`, `CLOSED` |
| `ASSIGNED` | `IN_PROGRESS`, `PENDING_CUSTOMER`, `CLOSED` |
| `IN_PROGRESS` | `PENDING_CUSTOMER`, `RESOLVED`, `CLOSED` |
| `PENDING_CUSTOMER` | `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `RESOLVED` | `IN_PROGRESS`, `CLOSED` |
| `CLOSED` | *(terminal — none)* |

`RESOLVED → IN_PROGRESS` is the reopen path: a customer says the fix did not work before the ticket was closed.

---

## Backend Tasks

### 1 — Transition graph constant

**File: `backend-nodejs/src/modules/tickets/ticket.constants.ts`**

Append below `TICKET_STATUS_CATALOGUE`:

```ts
/**
 * Server-enforced lifecycle. A transition absent from this map is rejected —
 * the client cannot move a ticket by writing `statusId` directly, because
 * `UpdateTicketInput` (Story 11) deliberately has no status field.
 */
export const TICKET_TRANSITIONS: Record<TicketStatusCode, TicketStatusCode[]> = {
  NEW: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING_CUSTOMER', 'CLOSED'],
  IN_PROGRESS: ['PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  PENDING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
};

export function canTransition(from: TicketStatusCode, to: TicketStatusCode): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}

export const TICKET_HISTORY_ACTIONS = {
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
} as const;

export type TicketHistoryAction =
  (typeof TICKET_HISTORY_ACTIONS)[keyof typeof TICKET_HISTORY_ACTIONS];
```

### 2 — History entity

**Create file: `backend-nodejs/src/modules/tickets/ticketHistory.entity.ts`**

`fromValue` / `toValue` are **denormalised display strings** (a status code, a user's name), not FKs. The audit trail must stay readable after a referenced user is deactivated or a category is renamed — that is the whole point of an audit row.

```ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';

@Entity('TicketHistory')
@Index(['ticketId'])
@Index(['actorUserId'])
@Index(['ticketId', 'createdAt'])
export class TicketHistory extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  ticketId!: string;

  @ManyToOne(() => Ticket, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  /** Server-stamped from `req.auth.userId`. Never accepted from the client. */
  @Column({ type: 'uniqueidentifier' })
  actorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'actorUserId' })
  actor?: User;

  @Column({ type: 'nvarchar', length: 50 })
  action!: string;

  /** Display value before the change. Null when there was none (first assignment). */
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  fromValue?: string | null;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  toValue?: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note?: string | null;
}
```

### 3 — Migration

**Create file: `backend-nodejs/src/database/migrations/1761000000000-TicketHistory.ts`**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketHistory1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [TicketHistory] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [ticketId] uniqueidentifier NOT NULL,
        [actorUserId] uniqueidentifier NOT NULL,
        [action] nvarchar(50) NOT NULL,
        [fromValue] nvarchar(200) NULL,
        [toValue] nvarchar(200) NULL,
        [note] nvarchar(500) NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([ticketId]) REFERENCES [Tickets]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([actorUserId]) REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX [IDX_TicketHistory_ticketId] ON [TicketHistory]([ticketId])`);
    await queryRunner.query(`CREATE INDEX [IDX_TicketHistory_actorUserId] ON [TicketHistory]([actorUserId])`);
    await queryRunner.query(
      `CREATE INDEX [IDX_TicketHistory_ticketId_createdAt] ON [TicketHistory]([ticketId], [createdAt] DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_ticketId_createdAt] ON [TicketHistory]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_actorUserId] ON [TicketHistory]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_ticketId] ON [TicketHistory]`);
    await queryRunner.query(`DROP TABLE [TicketHistory]`);
  }
}
```

### 4 — History service

**Create file: `backend-nodejs/src/modules/tickets/ticketHistory.service.ts`**

```ts
export interface PublicHistoryEntry {
  id: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  occurredAt: Date;
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null;
}
```

**`recordHistory(manager: EntityManager, input: {...}): Promise<void>`**

The first parameter is an **`EntityManager`, not optional**. Forcing every caller to hand in the transaction's manager makes it impossible to write an audit row outside the transaction that carries the change it audits. Do **not** add a convenience overload that opens its own transaction.

**`listHistory(ticketId, page = 1, pageSize = 20): Promise<PagedHistory>`**

- `leftJoin` the actor and `.select([...])` only `actor.id`, `actor.fullNameEn`, `actor.fullNameAr` — the `customerNotes.service.ts` rule.
- `orderBy('h.createdAt', 'DESC').addOrderBy('h.id', 'DESC')`. Several rows written inside one transaction can share a `createdAt` to the millisecond; without the tiebreak their relative order flips between requests and pagination drops rows.
- Return the `PagedHistory` shape from `customerHistory.service.ts` (~lines 21–26) — `items` / `total` / `page` / `pageSize`.
- Use a real SQL `skip`/`take` with `getManyAndCount()`. Unlike `customerHistory.service.ts`, which merges three sources in memory, this reads one table and must **not** load everything before slicing.

### 5 — Transition and assignment in the service

**File: `backend-nodejs/src/modules/tickets/tickets.service.ts`**

Append. Both functions are transactional; both write history through `recordHistory` with the transaction's `manager`.

**`transitionTicket(id, toStatusId, actorUserId, note?)`**

```
AppDataSource.transaction(async manager => {
  load the ticket with its status, inside the transaction
  resolve the target TicketStatus row by id → 404 if it does not exist
  if target.code === current.code → return the ticket unchanged, write NO history
  if (!canTransition(current.code, target.code)) →
      throw new ConflictError(`Cannot move a ticket from ${current.code} to ${target.code}`)
  manager.update(Ticket, id, { statusId: target.id })
  recordHistory(manager, {
    ticketId: id, actorUserId, action: STATUS_CHANGED,
    fromValue: current.code, toValue: target.code, note: note ?? null,
  })
})
```

Return the reloaded public ticket after the transaction commits.

**`assignTicket(id, assigneeUserId | null, actorUserId, note?)`**

```
AppDataSource.transaction(async manager => {
  load the ticket with its status and assignedUser
  if (current.status.code === 'CLOSED') → ConflictError('A closed ticket cannot be reassigned')
  if assigneeUserId is null:
      if ticket.assignedUserId is already null → no-op, return, write NO history
      manager.update(Ticket, id, { assignedUserId: null })
      recordHistory(… action: UNASSIGNED, fromValue: <previous assignee name>, toValue: null)
      return
  load the assignee User
      → NotFoundError('User') when missing
      → ValidationError({ assignedUserId: 'User is not active' }) when !isActive
      → ValidationError({ assignedUserId: 'User belongs to another branch' })
             when user.branchId !== ticket.branchId
      → ValidationError({ assignedUserId: 'Customers cannot be assigned tickets' })
             when the user's role code is CUSTOMER
  if (assigneeUserId === ticket.assignedUserId) → no-op, return, write NO history
  manager.update(Ticket, id, { assignedUserId: assigneeUserId })
  recordHistory(… action: ASSIGNED, fromValue: <previous assignee name or null>, toValue: <new assignee name>)

  // Assignment is what moves a brand-new ticket into the worked queue.
  if (current.status.code === 'NEW') {
    const assigned = await manager.findOne(TicketStatus, { where: { code: 'ASSIGNED' } })
    manager.update(Ticket, id, { statusId: assigned.id })
    recordHistory(… action: STATUS_CHANGED, fromValue: 'NEW', toValue: 'ASSIGNED',
                  note: 'Automatic on assignment')
  }
})
```

`fromValue` / `toValue` for assignment store the assignee's `fullNameEn`, not their id — see the entity comment in task 2.

**Priority auditing — modify the existing `updateTicket`:** when `input.priorityId` is present and differs from the current value, wrap the update in a transaction and write a `PRIORITY_CHANGED` row with the old and new priority **codes**. Leave `subject` / `description` / `categoryId` / `departmentId` edits unaudited, per the scope note.

### 6 — Schemas

**File: `backend-nodejs/src/modules/tickets/tickets.schemas.ts`**

```ts
export const transitionTicketSchema = z.object({
  statusId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export const assignTicketSchema = z.object({
  // null is an explicit unassign. `.nullable()` not `.nullish()` — an absent
  // key is a malformed request, whereas an explicit null is a real instruction.
  assignedUserId: z.string().uuid().nullable(),
  note: z.string().trim().max(500).optional(),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
```

### 7 — Controller

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Add an exported scope helper mirroring `requireCustomerInScope` (`customerChildren.controller.ts` ~lines 27–33) — Story 13 reuses it:

```ts
export async function requireTicketInScope(req: Parameters<RequestHandler>[0]): Promise<Ticket> {
  const ticket = await findById(req.params.id);
  if (req.auth?.roleCode !== ROLE_CODES.ADMIN && ticket.branchId !== req.auth!.branchId) {
    throw new ForbiddenError('This ticket belongs to another branch');
  }
  return ticket;
}
```

Add three handlers, each calling `requireTicketInScope(req)` first and taking the actor from `req.auth!.userId` — **never** from the body:

- `transition` → `transitionTicket(req.params.id, req.body.statusId, req.auth!.userId, req.body.note)`
- `assign` → `assignTicket(req.params.id, req.body.assignedUserId, req.auth!.userId, req.body.note)`
- `history` → `listHistory(req.params.id, req.query.page, req.query.pageSize)`

### 8 — Routes

**File: `backend-nodejs/src/modules/tickets/tickets.routes.ts`**

Append, each with an `@openapi` block:

| Method | Path | Permission | Validation |
|---|---|---|---|
| `PATCH` | `/:id/status` | `TICKETS_UPDATE` | `params: ticketIdParamSchema`, `body: transitionTicketSchema` |
| `PATCH` | `/:id/assignee` | `TICKETS_ASSIGN` | `params: ticketIdParamSchema`, `body: assignTicketSchema` |
| `GET` | `/:id/history` | `TICKETS_READ` | `params: ticketIdParamSchema`, `query: listHistoryQuerySchema` |

Note the deliberate asymmetry: **status** needs only `tickets.update`, so an Agent can work their own ticket, while **assignee** needs `tickets.assign`, which an Agent does not hold.

### 9 — Assignable users endpoint

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts` and `tickets.routes.ts`**

Story 14's assignment dropdown needs candidates, and `GET /api/v1/users` requires `users.read`, which an Agent does not hold. Add:

`GET /api/v1/tickets/assignable-users` — permission `TICKETS_READ`.

Returns active users in the caller's branch (Admins may pass `?branchId=`), excluding the `CUSTOMER` role, projected to `id` / `fullNameEn` / `fullNameAr` / `roleCode` only. Build it on `listUsers` (`users.service.ts` ~lines 108–119) and filter the role out in the mapper.

**Declare this route before `/:id`**, alongside `/meta` from Story 11.

### 10 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

For two of the six demo tickets from Story 11, walk a short realistic path so Story 14's timeline is not empty on first load: assign one (→ `ASSIGNED`, two history rows) and move another to `IN_PROGRESS` then `PENDING_CUSTOMER`. Write the history rows through the same service functions, not by inserting `TicketHistory` directly — seeding through the service is what proves the audit path works end to end.

---

## Frontend Tasks

No frontend changes required. Lifecycle actions and the timeline are Story 14.

---

## Edge Cases & Failure Modes

- **Invalid transition.** `NEW → RESOLVED` is not in `TICKET_TRANSITIONS`. `transitionTicket` throws `ConflictError` (409) naming both codes. Enforced in the service, **not** the controller, so every caller including the seed is bound by it.
- **Transition to the current status.** Returns 200 with the unchanged ticket and writes **no** history row. Without this guard a UI double-click floods the trail with `NEW → NEW`.
- **Any change to a `CLOSED` ticket.** `TICKET_TRANSITIONS.CLOSED` is empty, so every transition is refused; `assignTicket` refuses separately with its own message because an assignment attempt is not a transition and would otherwise pass the graph check untested.
- **Concurrent transitions.** Two agents move the same `IN_PROGRESS` ticket at once — one to `RESOLVED`, one to `PENDING_CUSTOMER`. Both read `IN_PROGRESS` inside their transactions and both graph checks pass, so the last commit wins and **two** history rows are written. The trail stays truthful and no data is corrupted. Full serialisation would need `SELECT … WITH (UPDLOCK)` on the ticket row; that is deliberately deferred — record it in the code comment so the next reader knows it was a decision, not an oversight.
- **Assignee in another branch.** The FK to `Users` accepts them. The explicit branch comparison in `assignTicket` rejects with 400 and `details.assignedUserId`.
- **Assignee is deactivated.** Rejected with *User is not active*. A deactivated user already assigned to a ticket **stays** assigned — this story does not sweep existing assignments, and doing so silently would lose the record of who owned the work.
- **Assigning the `CUSTOMER` role.** Explicitly rejected. Without the check a customer could be handed an internal queue item.
- **Reassigning to the current assignee.** No-op, no history row — same rationale as the self-transition.
- **Unassigning an already-unassigned ticket.** No-op, no history row.
- **Assignment at `NEW` writes two history rows** (`ASSIGNED` then `STATUS_CHANGED`) in one transaction. Both must appear; the timeline test asserts both.
- **Actor spoofing.** `actorUserId` comes only from `req.auth.userId`. No schema in task 6 accepts an actor field, so a client-supplied one is stripped by Zod before it reaches the service.
- **History rows sharing a millisecond.** The `addOrderBy('h.id', 'DESC')` tiebreak keeps ordering deterministic across paged requests.
- **Deleted assignee, renamed status.** `fromValue` / `toValue` are copied strings, so the trail still reads correctly after the referenced row changes or disappears.
- **History write fails.** It is inside the transaction, so the status or assignment change rolls back with it. There is no path that commits a change without its audit row.
- **Ticket soft-deleted with history rows.** `TicketHistory` rows are not cascaded — they keep pointing at a hidden ticket. Acceptable: `listHistory` is only reachable through a route that first resolves the ticket via `findById`, which excludes soft-deleted rows and 404s.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/ticketTransitions.spec.ts`.**
   - Every pair in the transition table returns `true` from `canTransition`.
   - A representative set of invalid pairs returns `false`: `NEW → RESOLVED`, `NEW → PENDING_CUSTOMER`, `ASSIGNED → RESOLVED`, `RESOLVED → PENDING_CUSTOMER`, `CLOSED → IN_PROGRESS`.
   - `TICKET_TRANSITIONS.CLOSED` is `[]`.
   - Every key of `TICKET_TRANSITIONS` is a member of `TICKET_STATUS_CODES`, and every target value is too — this catches a typo'd code that would silently make a transition unreachable.
   - Every status except `CLOSED` can reach `CLOSED` in one step.
2. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/ticketHistory.spec.ts`.**
   - `TICKET_HISTORY_ACTIONS` contains the four expected actions.
   - The `PublicHistoryEntry` mapper emits `actor: null` for a row whose actor join came back empty, rather than throwing.
3. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketLifecycle.itest.ts`.**
   - `PATCH /:id/status` `NEW → IN_PROGRESS` returns 200 and the new status; one `STATUS_CHANGED` row appears with `fromValue: 'NEW'`, `toValue: 'IN_PROGRESS'`, and the caller as actor.
   - `NEW → RESOLVED` returns **409** and leaves both the status and the history unchanged.
   - Transitioning to the current status returns 200 and adds **no** history row.
   - A `CLOSED` ticket returns 409 for every attempted transition.
   - The `note` is persisted on the history row and is capped at 500 chars by validation.
   - A ticket in another branch returns 403 for a Supervisor.
   - An Agent (holding `tickets.update`) **can** transition; the same Agent gets 403 on `PATCH /:id/assignee`.
4. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketAssignment.itest.ts`.**
   - Assigning a `NEW` ticket sets the assignee, moves the status to `ASSIGNED`, and writes **exactly two** history rows.
   - Assigning an `IN_PROGRESS` ticket writes **one** row and leaves the status alone.
   - Reassigning to a different user writes one `ASSIGNED` row whose `fromValue` is the previous assignee's name.
   - Reassigning to the current assignee is a no-op with no new row.
   - `assignedUserId: null` unassigns, writes `UNASSIGNED`, and does **not** revert the status to `NEW`.
   - Unassigning an unassigned ticket is a no-op with no new row.
   - An assignee from another branch returns 400 with `details.assignedUserId`.
   - A deactivated assignee returns 400.
   - A `CUSTOMER`-role assignee returns 400.
   - A non-existent assignee returns 404.
   - Assigning a `CLOSED` ticket returns 409.
   - Omitting `assignedUserId` entirely returns 400 — absence is not unassignment.
5. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketHistory.itest.ts`.**
   - `GET /:id/history` returns entries **newest first**.
   - A ticket walked through assign → in progress → pending → resolved returns every step in reverse order.
   - Pagination with `pageSize=2` returns disjoint id sets and a correct `total`.
   - The actor object carries `fullNameEn` and **no** `passwordHash` — assert on the raw response text.
   - History for a ticket with no changes returns an empty `items` array and `total: 0`, not a 404.
   - A ticket in another branch returns 403.
   - `GET /api/v1/tickets/assignable-users` excludes `CUSTOMER`-role users and inactive users, and an Agent can call it.
6. **Regression:** re-run the Story 11 suites. Adding the priority-change audit alters `updateTicket`'s internals; its existing tests must still pass unchanged.

---

## Migration / Rollback

- Run `npm run migration:run` before `npm run db:seed`.
- `down()` drops `TicketHistory` **and every audit row in it, permanently**. There is no recovery. Export the table before rolling back in any environment whose history matters.
- Rolling back this story while Story 13 is applied is unsupported — apply migrations in timestamp order and revert in reverse: `1762000000000` → `1761000000000` → `1760000000000`.
- No column on `Tickets` changes in this story, so a rollback cannot corrupt ticket rows; it only removes the trail.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Confirm two demo tickets end with non-empty history.
4. **Unit tests:** `npm test` in `backend-nodejs/`.
5. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
6. **Backend runs:** `npm run dev` in `backend-nodejs/`, then with an admin token:
   - `PATCH /api/v1/tickets/<id>/status` with `{"statusId":"<IN_PROGRESS id>"}` → 200.
   - The same call with the `RESOLVED` id from a `NEW` ticket → 409.
   - `PATCH /api/v1/tickets/<id>/assignee` with `{"assignedUserId":"<agent id>"}` → 200, status becomes `ASSIGNED`.
   - `GET /api/v1/tickets/<id>/history` → two entries, newest first.
   - `GET /api/v1/tickets/assignable-users` → no `CUSTOMER`-role rows.
7. **Permission check:** sign in as `agent@azm.local`, confirm `PATCH /:id/status` succeeds and `PATCH /:id/assignee` returns 403.
8. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `TicketHistory` table exists, indexed on `(ticketId, createdAt DESC)`.
- [ ] The transition graph is enforced server-side; every invalid pair returns 409.
- [ ] `CLOSED` is terminal for both transitions and assignment.
- [ ] A no-op transition or reassignment returns 200 and writes no history row.
- [ ] Assigning a `NEW` ticket moves it to `ASSIGNED` atomically and writes both rows.
- [ ] Unassigning does not revert the status.
- [ ] An assignee must be active, in the ticket's branch, and not a `CUSTOMER`.
- [ ] Every status, assignment, and priority change writes exactly one history row **in the same transaction**.
- [ ] The actor is always taken from the token, never from the request body.
- [ ] History reads newest-first with a deterministic tiebreak and real SQL pagination.
- [ ] No history response contains `passwordHash`.
- [ ] `tickets.update` gates transitions; `tickets.assign` gates assignment; an Agent can do the first and not the second.
- [ ] `GET /api/v1/tickets/assignable-users` is callable by an Agent and excludes customers and inactive users.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 13.**
