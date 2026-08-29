# Story 20 — Basic Administration APIs (Story: 27)

## Prerequisites

- **Story 15 completed** ([15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md)) — `admin.manage` exists and is seeded to Administrator and Manager; `recordAudit` exists; `AUDIT_ACTIONS.CONFIG_CREATED` / `CONFIG_UPDATED` / `CONFIG_DEACTIVATED` and the five configuration `AUDIT_ENTITY_TYPES` exist; `Users.customerId` and its filtered unique index exist.
- **Story 18 completed** ([18-story-customer-self-service-backend-27.md](18-story-customer-self-service-backend-27.md)) — the portal depends on `Users.customerId` being linkable, and on a `SUPPORT` department existing per branch. **This story is what makes linking possible through an API instead of through the seed.**
- **Story 19 completed** ([19-story-dashboard-and-reporting-apis-27.md](19-story-dashboard-and-reporting-apis-27.md)) — its migration took `1766000000000`; this story takes **`1767000000000`**.

**This story is backend-only.** Administration screens are Story 23.

---

## Story Goal

Give an authorised user the ability to maintain the reference data every other module already depends on, without letting them break it:

1. **Branches and departments** — create, rename, activate, deactivate.
2. **Ticket categories and priorities** — create, rename, reorder, deactivate.
3. **Ticket statuses** — **rename and reorder only.** Creating or removing a status would desynchronise the hard-coded transition graph.
4. **Customer account linking** — set or clear a user's `customerId`, the operation the portal depends on.
5. **Every configuration change audited** through the service Story 15 built.

**Not in scope:**
- Editing the transition graph, permission codes, or role-permission mappings. Those live in code (`ticket.constants.ts`, `permissions.constants.ts`) and are seeded; making them editable at runtime is a much larger change than this work item allows.
- Hard deletion of any reference row. **Deactivation is the only removal mechanism.**
- User CRUD — that already exists in `users.routes.ts` (~lines 62–120).
- Role or permission management screens beyond the existing read-only `GET /users/roles`.
- Any frontend → Story 23.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/branches/branch.entity.ts` — the whole file (18 lines). `code` unique, `nameEn`, `nameAr`, `isActive`. **No service, controller, or route exists for it today** — that is the gap.
2. `backend-nodejs/src/modules/departments/department.entity.ts` — the whole file (28 lines). Note the **two** unique indexes (~lines 7–8): `['code']` globally unique **and** `['branchId','code']`. The global one is the stricter constraint and it is what actually binds — a `SUPPORT` department cannot exist in two branches under this schema. **Read both indexes carefully before task 3; Story 18's seed adds `SUPPORT` to both branches and will collide.**
3. `backend-nodejs/src/modules/tickets/ticketCategory.entity.ts`, `ticketPriority.entity.ts`, `ticketStatus.entity.ts` — 18 lines each, identical shape: `code` unique, `nameEn`, `nameAr`, `sortOrder`. **None has an `isActive` column**; task 6's migration adds one to categories and priorities.
4. `backend-nodejs/src/modules/customers/customers.service.ts` — the whole file (165 lines). The **exact service shape to copy**: `PublicCustomer` / `CreateCustomerInput` / `UpdateCustomerInput` / `ListCustomersFilter` (~lines 5–50), `createCustomer` (~lines 118–142), `updateCustomer` (~lines 144–149), `setCustomerActive` (~lines 151–156).
5. `backend-nodejs/src/modules/customers/customers.controller.ts` — the `isUnscoped` helper and the create/update/setActive handlers. The response envelope and error propagation to copy.
6. `backend-nodejs/src/modules/customers/customers.routes.ts` — ~lines 37, 66, 116, 148, 182, 207. `router.use(authenticate)` then one `authorize(...)` per route; note that `PATCH /:id/active` is a **separate route** from `PATCH /:id`, which is the pattern every activation toggle here follows.
7. `backend-nodejs/src/modules/users/users.service.ts` — `updateUser` (~lines 149–160) and `PublicUser` (~lines 9–21). Task 5 extends both to carry `customerId`.
8. `backend-nodejs/src/modules/users/users.routes.ts` — ~lines 98–120. Where the link route is added, and the permission idiom.
9. `backend-nodejs/src/modules/tickets/ticket.constants.ts` — `TICKET_STATUS_CODES` (~lines 6–13) and `TICKET_TRANSITIONS` (~lines 43–50). **The graph is keyed by status *code*.** A status renamed keeps its code and stays valid; a status **created** has no graph entry and can never be transitioned into or out of. That is the whole reason statuses are rename-only.
10. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — `meta` (~lines 131–146). It reads all three reference tables with no `isActive` filter today; task 4 makes it filter.
11. `backend-nodejs/src/common/audit/audit.service.ts` (Story 15) — `recordAudit(manager, input)`.
12. `backend-nodejs/src/database/migrations/1760000000000-TicketManagement.ts` — ~lines 19–24 and ~lines 55–61. `ALTER TABLE … ADD` with a named default constraint, and `UPDATE` statements that backfill reference data.

Grep targets:
- Grep for `TicketCategory` in `backend-nodejs/src/` — every consumer that will start seeing an `isActive` column.
- Grep for `getRepository(Branch)` and `getRepository(Department)` — today only the seed touches them; confirm before adding a service.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Permission** | Every write in this story requires `admin.manage` — Administrator and Manager only. Reads of reference data keep their existing, looser gates so ticket screens keep working. |
| **Branch scoping** | A Manager may administer only **their own** branch's departments. An Administrator may administer any. Branch create/update is **Administrator-only**. |
| **No hard delete** | Every removal is `isActive = false`. A reference row is pointed at by tickets and users; deleting it would dangle an FK or silently drop history. |
| **Statuses** | Rename (`nameEn` / `nameAr`) and reorder (`sortOrder`) only. **No create, no deactivate, no code change.** The transition graph is keyed by code and lives in source. |
| **Codes are immutable** | Once created, a `code` on any reference row cannot change. Codes appear in `TICKET_TRANSITIONS`, in seeds, and in already-written `TicketHistory.fromValue` / `toValue` strings. |
| **Deactivation is not retroactive** | Deactivating a category leaves existing tickets pointing at it, and they keep displaying it. It only stops being **offered** for new tickets. |
| **`meta` filters** | `GET /tickets/meta` returns **active** categories and priorities only. `GET /admin/…` returns everything, so an administrator can see and reactivate what they hid. |
| **Customer linking** | Setting `customerId` requires the target user to hold the `CUSTOMER` role and the customer to be active and unlinked. Clearing it is always allowed. |
| **Audit** | Every create, update, reorder, activation change, and link change writes one audit row **in the same transaction**. |

---

## Backend Tasks

### 1 — Reference-data `isActive` columns

`TicketCategories` and `TicketPriorities` have no `isActive` column (verified: `ticketCategory.entity.ts` and `ticketPriority.entity.ts`, 18 lines each). Add one to each entity:

```ts
@Column({ type: 'bit', default: true })
isActive!: boolean;
```

**Do not add one to `TicketStatus`.** A deactivated status would still be reachable through the transition graph, producing a state the UI cannot offer but the API accepts. Statuses are governed by the graph, not by a flag — put that sentence in a comment on the entity.

### 2 — Branch administration

**Create file: `backend-nodejs/src/modules/branches/branches.service.ts`**

Copy `customers.service.ts` structure exactly. Exports: `PublicBranch`, `CreateBranchInput`, `UpdateBranchInput`, `listBranches(includeInactive)`, `findById`, `createBranch`, `updateBranch`, `setBranchActive`.

- `createBranch` — `code` is uppercased and trimmed; a duplicate throws `ConflictError`. Writes `CONFIG_CREATED` / `AUDIT_ENTITY_TYPES.BRANCH`.
- `updateBranch` — accepts `nameEn` / `nameAr` **only**. `code` is not in `UpdateBranchInput`, so it cannot be changed.
- `setBranchActive(id, false)` — refuses with `ConflictError` when the branch still has **active users** or **open tickets**. Deactivating a branch out from under its staff would leave them authenticated but scoped to nothing. Count both in the same transaction and name which one blocked it in the message.

**Create files: `branches.controller.ts`, `branches.routes.ts`, `branches.schemas.ts`.**

| Method | Path | Permission | Extra |
|---|---|---|---|
| `GET` | `/api/v1/admin/branches` | `admin.manage` | `?includeInactive=true` |
| `POST` | `/api/v1/admin/branches` | `admin.manage` | **Administrator role only** — an explicit `roleCode === ADMIN` check in the controller, because `admin.manage` alone is held by Managers too |
| `PATCH` | `/api/v1/admin/branches/:id` | `admin.manage` | Administrator only |
| `PATCH` | `/api/v1/admin/branches/:id/active` | `admin.manage` | Administrator only |

The role check is a **second** gate on top of the permission. Write it as one shared helper, `requireAdministrator(req)`, in a new `backend-nodejs/src/modules/admin/admin.guard.ts`, so it is not retyped four times.

### 3 — Department administration

**Create file: `backend-nodejs/src/modules/departments/departments.service.ts`**

Same shape. `listDepartments({ branchId, includeInactive })`, `createDepartment`, `updateDepartment`, `setDepartmentActive`.

**The unique-index trap:** `department.entity.ts` declares **both** `@Index(['code'], { unique: true })` (~line 7) and `@Index(['branchId','code'], { unique: true })` (~line 8). The first makes `code` globally unique, so the same code cannot exist in two branches — which contradicts the second index's intent and collides with Story 18's seed, which adds `SUPPORT` to both branches.

Resolve it in this story's migration: **drop the global unique index on `[code]` and keep the composite one.** That is the constraint the entity's own composite index says was intended, and it is what lets each branch have its own `SUPPORT` department. Update `department.entity.ts` to remove the global `@Index(['code'], { unique: true })` line and leave a non-unique `@Index(['code'])` in its place.

Then:
- `createDepartment` — rejects a duplicate `(branchId, code)` with `ConflictError`. A Manager may only create in their own branch; an Administrator anywhere. Writes `CONFIG_CREATED` / `DEPARTMENT`.
- `setDepartmentActive(id, false)` — refuses when the department has active users or open tickets, same rule and same message shape as branches.

Routes under `/api/v1/admin/departments`, gated on `admin.manage`, with the branch check in the controller rather than the service so the error is a clean 403.

### 4 — Ticket reference administration

**Create file: `backend-nodejs/src/modules/admin/referenceData.service.ts`**

One service covering categories, priorities, and statuses, because the three tables are structurally identical and three near-copies would drift.

```ts
type ReferenceKind = 'categories' | 'priorities' | 'statuses';
```

Exports:
- **`listReference(kind, includeInactive)`** — ordered by `sortOrder ASC`, then `code ASC`.
- **`createReference(kind, input, actorUserId)`** — **throws `ForbiddenError` when `kind === 'statuses'`**, with a message naming the transition graph. This guard is the story's central rule; put it at the top of the function, not in a controller.
- **`updateReference(kind, id, input, actorUserId)`** — accepts `nameEn`, `nameAr`, `sortOrder`. **Never `code`.** Legal for all three kinds, including statuses.
- **`setReferenceActive(kind, id, isActive, actorUserId)`** — **throws `ForbiddenError` for `statuses`.** For categories and priorities, deactivating is allowed even when tickets reference the row (unlike branches) — an existing ticket keeps showing its category; the row just stops being offered. **Deactivating a priority additionally refuses when an active `SlaPolicies` row points at it** (Story 16), because SLA maths would then silently stop applying to tickets at that priority.

Every write records `CONFIG_CREATED` / `CONFIG_UPDATED` / `CONFIG_DEACTIVATED` against the matching `AUDIT_ENTITY_TYPES` value, inside the transaction.

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

`meta` (~lines 131–146) currently returns all rows. Add `where: { isActive: true }` to the category and priority queries. **Leave the status query unfiltered** — statuses have no flag by design.

This is a **behaviour change for existing screens**: a deactivated category disappears from the ticket create form. That is the intent; note it in the controller comment and cover it with a test.

### 5 — Customer account linking

**File: `backend-nodejs/src/modules/users/users.service.ts`**

- Add `customerId: string | null` to `PublicUser` (~lines 9–21) and `toPublicUser` (~lines 48–64).
- Add `linkCustomer(userId, customerId | null, actorUserId): Promise<PublicUser>`:
  1. Load the user with its role. Throw `NotFoundError` when absent.
  2. When `customerId` is null → clear and save. **Always allowed** — unlinking is the recovery path for a mistake and must never be blocked.
  3. When setting: the user's role code must be `CUSTOMER`, else `ValidationError({ userId: 'Only a CUSTOMER-role user can be linked to a customer' })`.
  4. The customer must exist and be active, else `ValidationError({ customerId: … })`.
  5. Another user already linked to that customer → `ConflictError`. **Check explicitly rather than letting `UX_Users_customerId` surface as a 500** — the index is the backstop, the check is the error message.
  6. Save and `recordAudit` with `CONFIG_UPDATED` / `AUDIT_ENTITY_TYPES.BRANCH`… **no** — use a dedicated summary against the user, `entityType: AUDIT_ENTITY_TYPES.TICKET`… also wrong. Story 15's `AUDIT_ENTITY_TYPES` has no `USER` member. **Add `USER: 'User'` to `AUDIT_ENTITY_TYPES` in this story** — this is the one documented exception to Story 15's "add no new audit constants" rule, and it must be called out in the commit.

**File: `backend-nodejs/src/modules/users/users.routes.ts`**

Add after the existing `PATCH` routes (~line 116):

```
PATCH /api/v1/users/:id/customer   —  authorize(PERMISSIONS.ADMIN_MANAGE)
```

Body: `{ customerId: string | null }`, schema `z.object({ customerId: z.string().uuid().nullable() })`. **Nullable, not optional** — an omitted field must be a 422, not a silent unlink. That distinction is exactly what Story 12 established for `assignedUserId` (`tickets.schemas.ts` ~line 47); copy it.

### 6 — Migration

**Create file: `backend-nodejs/src/database/migrations/1767000000000-Administration.ts`**

`up()`:
```sql
ALTER TABLE [TicketCategories] ADD [isActive] bit NOT NULL
  CONSTRAINT [DF_TicketCategories_isActive] DEFAULT 1
ALTER TABLE [TicketPriorities] ADD [isActive] bit NOT NULL
  CONSTRAINT [DF_TicketPriorities_isActive] DEFAULT 1

DROP INDEX [IDX_Departments_code] ON [Departments]
CREATE INDEX [IDX_Departments_code] ON [Departments]([code])
```

The index names must be confirmed against the database before writing this: TypeORM generated them from `department.entity.ts` (~lines 6–8), and the generated name may not be `IDX_Departments_code`. **Query `sys.indexes` for the `Departments` table and use the real name** — a `DROP INDEX` on a wrong name fails the whole migration.

The composite `['branchId','code']` unique index stays untouched.

`down()`: restore the global unique index on `[code]` — **which will fail if two branches now share a department code.** Say so in the `down()` comment: reverting this migration requires first resolving duplicate department codes by hand. Then drop both `isActive` columns, dropping each named default constraint **before** its column.

### 7 — Routes registration

**File: `backend-nodejs/src/routes/v1.ts`**

```ts
v1.use('/admin', adminRoutes);
```

`adminRoutes` composes the branches, departments, and reference-data routers under one mount, so `v1.ts` grows by one line rather than three. The customer-link route lives under `/users`, where it belongs — it is a user operation, not a configuration one.

---

## Edge Cases & Failure Modes

- **Creating a ticket status.** Refused with 403 from `createReference`, message naming `TICKET_TRANSITIONS`. Without the guard, the new status has no graph entry: nothing can transition into it and nothing out of it, so any ticket set to it is permanently stuck. **This is the story's most consequential guard — test it directly.**
- **Deactivating a ticket status.** Refused for the same reason. There is no `isActive` column to set, so the API surface must reject it rather than 500 on a missing column.
- **Renaming a status.** Allowed. `TICKET_TRANSITIONS` is keyed by `code` (`ticket.constants.ts` ~lines 43–50) and `TicketHistory.fromValue` stores codes, so a display-name change breaks nothing.
- **Changing any `code`.** Impossible — `code` is absent from every update input type. Not merely validated away: absent from the type, so it cannot compile.
- **Deactivating a category that tickets use.** Allowed. Existing tickets keep displaying it; it stops appearing in `GET /tickets/meta`. Assert both halves.
- **Deactivating a priority with an active SLA policy.** Refused with 409. Otherwise tickets at that priority silently keep their SLA targets while the priority is invisible, and a manager cannot tell why the numbers look wrong.
- **Deactivating a branch with active users.** Refused with 409 naming the count. Those users would otherwise stay authenticated with `branchId` pointing at an inactive branch, and every scoped query would return nothing with no explanation.
- **Deactivating a department with open tickets.** Refused with 409. It would also break Story 18's `resolveIntakeDepartment` if it were the branch's only active department.
- **Deactivating the last active department in a branch.** Not specifically blocked, but it makes portal ticket creation return 409 (Story 18's `resolveIntakeDepartment` step 3). Acceptable and self-announcing — the administrator gets a clear error the next time a customer submits the form. Note it in the service comment.
- **The department global unique index.** Story 18's seed adds `SUPPORT` to both branches; under the current schema the second insert fails. **This story's migration is what makes that seed work.** If Story 18 shipped first and its seed failed, this is the fix — say so in the migration comment.
- **A wrong index name in `DROP INDEX`.** Fails the migration. Confirm the real name from `sys.indexes` before writing the statement.
- **Linking a non-`CUSTOMER` user.** Rejected with 422 and `details.userId`. Without it, a staff account would gain a portal identity while keeping staff permissions.
- **Linking a customer that already has an account.** Rejected with 409 by the explicit check. `UX_Users_customerId` (Story 15) is the backstop; relying on it alone yields a driver-level 500 with no useful message.
- **Unlinking.** Always allowed, even for an inactive customer. It is the recovery path; blocking it would strand a misconfigured account.
- **Omitting `customerId` in the link body.** 422. An omitted field must not be read as "unlink" — the same rule Story 12 set for `assignedUserId`.
- **A Manager administering another branch's departments.** 403 from the controller's branch check, matching the shape used across the ticket and customer controllers.
- **A Manager creating a branch.** 403 from `requireAdministrator`, even though they hold `admin.manage`. The permission is the first gate; the role is the second.
- **Two administrators reordering the same list concurrently.** Last write wins on `sortOrder`; both audit rows are written. Duplicate `sortOrder` values are legal — the secondary `code ASC` sort keeps the order deterministic.
- **`GET /tickets/meta` filtering by `isActive`.** Existing ticket-screen tests may assert a category count. **Expect those to need updating** if any seeded category is deactivated; they should pass unchanged against the default seed, where everything is active.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/admin/__tests__/admin.schemas.spec.ts`.**
   - No update schema in this story has a `code` key.
   - The customer-link schema **rejects an omitted `customerId`** and accepts an explicit `null`.
   - `sortOrder` rejects negatives and accepts `0`.
   - Branch and department create schemas require `code`, `nameEn`, and `nameAr`.
2. **Unit — create `backend-nodejs/src/modules/admin/__tests__/referenceGuards.spec.ts`.**
   - `createReference('statuses', …)` throws `ForbiddenError`.
   - `setReferenceActive('statuses', …)` throws `ForbiddenError`.
   - `createReference('categories', …)` and `('priorities', …)` do not throw on the kind check.
3. **Integration — create `backend-nodejs/src/modules/admin/__tests__/adminReference.itest.ts`.**
   - `POST /api/v1/admin/reference/statuses` returns **403** for an Administrator — the permission is not the blocker, the rule is.
   - `PATCH /api/v1/admin/reference/statuses/:id` renaming succeeds and writes one `CONFIG_UPDATED` audit row.
   - Creating a category succeeds, appears in `GET /tickets/meta`, and writes `CONFIG_CREATED`.
   - Deactivating it removes it from `GET /tickets/meta` while a ticket already using it still returns it on `GET /tickets/:id`.
   - Deactivating a priority that an active `SlaPolicies` row references returns **409**.
   - An Agent gets 403 on every write and a Supervisor gets 403 on every write.
4. **Integration — create `backend-nodejs/src/modules/branches/__tests__/adminBranches.itest.ts`.**
   - An Administrator creates, renames, and deactivates an empty branch.
   - A **Manager** holding `admin.manage` gets 403 on branch create — the role second-gate.
   - Deactivating a branch with an active user returns 409 naming users.
   - Deactivating a branch with an open ticket returns 409 naming tickets.
   - A duplicate branch code returns 409.
5. **Integration — create `backend-nodejs/src/modules/departments/__tests__/adminDepartments.itest.ts`.**
   - **The same department code exists in two branches** — the index-fix assertion; this fails before the migration and passes after.
   - A duplicate `(branchId, code)` returns 409.
   - A Manager creates a department in their own branch (200) and gets 403 for another branch.
   - Deactivating a department with open tickets returns 409.
6. **Integration — create `backend-nodejs/src/modules/users/__tests__/customerLink.itest.ts`.**
   - Linking a `CUSTOMER`-role user to an unlinked, active customer returns 200 and `customerId` on the payload.
   - The linked account can immediately call `GET /api/v1/portal/tickets` **without re-authenticating** — proving Story 18's per-request re-read.
   - Linking a `MANAGER`-role user returns 422 with `details.userId`.
   - Linking an already-linked customer returns **409**, not 500.
   - Linking an inactive customer returns 422.
   - `{ "customerId": null }` unlinks and returns 200; the account then gets 403 from the portal.
   - An omitted `customerId` returns 422.
   - A caller without `admin.manage` gets 403.
   - No response contains `passwordHash`.
7. **Regression:** re-run the Story 11–14 and Story 16–19 suites. The `GET /tickets/meta` change is the one with regression potential; the ticket-screen tests must pass **unchanged** against the default all-active seed.

---

## Migration / Rollback

- Run `npm run migration:run`, then `npm run db:seed`.
- Timestamp `1767000000000` follows Story 19's `1766000000000`. **Confirm no `1767` file exists before creating it.**
- **Before writing the `DROP INDEX` statement**, query `sys.indexes` for the `Departments` table and use the actual generated index name. A guessed name fails the migration outright.
- `down()` restores the global unique index on `Departments.code`, **which fails if two branches now share a code.** Deduplicate by hand first. This is the one non-mechanical revert in the feature — say so in the comment.
- Dropping the `isActive` columns loses which reference rows were hidden. Export `SELECT code, isActive FROM TicketCategories` and the priorities equivalent before reverting.
- **Half-applied state:** if the `isActive` columns are added but the index change fails, the app runs and only Story 18's two-branch `SUPPORT` seed stays broken. Revert fully and re-run.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Index confirmed:** `SELECT name, is_unique FROM sys.indexes WHERE object_id = OBJECT_ID('Departments')` — the `[code]` index is present and **not** unique; the `(branchId, code)` index is present and unique.
4. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. `SELECT branchId, code FROM Departments WHERE code = 'SUPPORT'` returns **two** rows.
5. **Unit tests:** `npm test` in `backend-nodejs/`.
6. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
7. **Backend runs:** `npm run dev` in `backend-nodejs/`, then as `admin@azm.local`:
   - `POST /api/v1/admin/reference/statuses` → **403**.
   - `PATCH /api/v1/admin/reference/statuses/<id>` with `{"nameEn":"In Progress (Team)"}` → 200.
   - `POST /api/v1/admin/reference/categories` → 201, then `GET /api/v1/tickets/meta` includes it.
   - `PATCH /api/v1/admin/reference/categories/<id>/active` with `{"isActive":false}` → 200, then `GET /api/v1/tickets/meta` **excludes** it.
   - `PATCH /api/v1/admin/branches/<HQ id>/active` with `{"isActive":false}` → 409.
   - `PATCH /api/v1/users/<a customer user id>/customer` with `{"customerId":"<CUST003 id>"}` → 200; that account can immediately call `GET /api/v1/portal/tickets`.
   - The same call for `CUST001` (already linked) → 409.
8. **Manager check:** as `manager@azm.local`, `POST /api/v1/admin/branches` → 403; `POST /api/v1/admin/departments` in HQ → 201.
9. **Swagger:** `GET /api/docs` lists the Admin tag with every route above.
10. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `TicketCategories.isActive` and `TicketPriorities.isActive` exist and default to true; **`TicketStatuses` has no such column.**
- [ ] The global unique index on `Departments.code` is replaced by a non-unique one; the `(branchId, code)` unique index survives.
- [ ] The same department code exists in two branches, and Story 18's `SUPPORT` seed succeeds.
- [ ] Creating or deactivating a ticket status returns 403, with a message naming the transition graph.
- [ ] Renaming and reordering a status succeeds.
- [ ] No update input type in this story has a `code` field.
- [ ] Deactivating a category removes it from `GET /tickets/meta` while tickets already using it still display it.
- [ ] Deactivating a priority with an active SLA policy returns 409.
- [ ] Deactivating a branch or department with active users or open tickets returns 409 naming which.
- [ ] Branch create/update/deactivate additionally requires the Administrator **role**, via one shared `requireAdministrator` helper.
- [ ] A Manager may administer only their own branch's departments.
- [ ] `PATCH /users/:id/customer` links and unlinks; the linked account reaches the portal without re-authenticating.
- [ ] Linking a non-customer role → 422; an already-linked customer → **409, not 500**; an inactive customer → 422; an omitted `customerId` → 422.
- [ ] `AUDIT_ENTITY_TYPES.USER` is added, and the addition is called out as the documented exception to Story 15's rule.
- [ ] Every configuration write records exactly one audit row in the same transaction.
- [ ] No reference row is ever hard-deleted by any route in this story.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 21.**
