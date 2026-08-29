# Story 18 — Customer Self-Service Backend & Support Web Form (Story: 27)

## Prerequisites

- **Story 15 completed** ([15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md)) — `Users.customerId` exists with its filtered unique index, `CUSTOMER` holds `tickets.read` / `tickets.create` / `kb.read`, `Tickets.channel` exists with `TICKET_CHANNELS`, and `recordAudit` is available.
- **Story 16 completed** ([16-story-sla-configuration-and-status-27.md](16-story-sla-configuration-and-status-27.md)) — every ticket payload carries `sla`, so the portal's ticket views need no separate SLA call.
- **Story 17 completed** ([17-story-knowledge-base-backend-27.md](17-story-knowledge-base-backend-27.md)) — `GET /api/v1/kb/articles` is already published-only for a `CUSTOMER` caller, so **the portal needs no KB endpoint of its own**.
- **Story 11–13 completed** — `tickets.service.ts`, `ticketNotes.service.ts`, `ticketAttachments.service.ts`, and `listHistory` are the functions the portal reuses rather than reimplements.

**This story is backend-only.** The portal screens and the support form UI are Story 22.

---

## Story Goal

Let a signed-in customer serve themselves, on top of the ticket module that already exists:

1. **A portal ticket list** — only the tickets belonging to the customer the account is linked to.
2. **A portal ticket detail** — the ticket, its customer-visible notes, its attachments, and its history with internal entries withheld.
3. **A support web form** — one endpoint that creates a ticket from a short payload, stamping `channel: 'WEB'` and resolving the customer, branch, and department from the account rather than trusting the body.
4. **A reply path** — a customer can add a customer-visible note to their own ticket.
5. **Ownership enforced in one place** — a single guard resolves the caller's `customerId` and every portal route goes through it.

**Not in scope:**
- An unauthenticated, public intake form. The work item says to reuse the authentication already implemented; a customer signs in first. **A public endpoint is deliberately excluded** because it would need rate-limiting, spam handling, and an anonymous-customer record — all of which the work item's "no extra infrastructure" rule rules out.
- Customer self-registration, password reset, or account linking. An administrator links `Users.customerId` (Story 20).
- A customer editing, transitioning, assigning, or closing a ticket.
- Attachment upload by a customer. Reading and downloading only; upload stays a staff action in this scope.
- Any frontend → Story 22.

---

## Context — Read These Files First

1. `backend-nodejs/src/types/express.d.ts` — the whole file (19 lines). `AuthContext` (~lines 1–9) carries `userId`, `roleCode`, `branchId`, `permissions` — **but not `customerId`.** Task 2 adds it, and that is what makes the guard a one-liner everywhere else.
2. `backend-nodejs/src/common/middleware/authenticate.ts` — the whole file (52 lines). ~Lines 38–46 build `req.auth`; the user record is re-read on **every** request (~line 33), so a newly linked account takes effect immediately without a re-login. Task 2 extends this object.
3. `backend-nodejs/src/modules/users/users.service.ts` — `findByIdWithPermissions` (~lines 91–101). This is the query `authenticate` calls; it must start selecting `customerId`.
4. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — the whole file (255 lines). Specifically:
   - `isUnscoped` (~lines 22–24) — the role-check idiom the portal guard mirrors.
   - `list` (~lines 38–69) — note that branch scoping is applied by **overwriting** `filter.branchId` (~lines 56–58) rather than rejecting a supplied one. The portal does the same with `customerId`.
   - `create` (~lines 89–110) — the branch and customer-branch checks the portal form must not duplicate.
   - `history` (~lines 200–222) — `includeInternal` is already `false` for a `CUSTOMER` caller (~line 210). **The portal inherits this for free.**
5. `backend-nodejs/src/modules/tickets/ticketChildren.controller.ts` — `requireTicketInScope` (~lines 29–35) and `listNotes` (~lines 40–53). Note ~line 43: internal notes are already withheld from a `CUSTOMER` caller. The portal reuses both functions.
6. `backend-nodejs/src/modules/tickets/tickets.service.ts` — `listTickets` (~lines 162–205) already accepts `customerId` in `ListTicketsFilter` (~line 51) and applies it (~line 176). **The portal list is a thin wrapper over this — do not write a second query.** `createTicket` (~lines 122–160) is likewise reused as-is.
7. `backend-nodejs/src/modules/customers/customers.service.ts` — `findById` (~lines 112–117) and `toPublicCustomer` (~lines 52–84). The portal profile endpoint reuses both; note which fields are safe to return.
8. `backend-nodejs/src/modules/tickets/ticketNotes.service.ts` — `createNote`. The portal reply forces `isInternal: false`; read the signature to see where that is passed.
9. `backend-nodejs/src/modules/tickets/tickets.schemas.ts` — the whole file (54 lines). `createTicketSchema` (~lines 3–11) requires `customerId`, `departmentId`, and `branchId`. **The portal form schema must not** — those come from the account.
10. `backend-nodejs/src/routes/v1.ts` — ~lines 8–17. This story adds one mount.
11. `backend-nodejs/src/common/errors/AppError.ts` — the whole file (32 lines). `ForbiddenError` is 403, `NotFoundError` is 404, `ValidationError` is **422**.

Grep targets:
- Grep for `req.auth!.branchId` in `backend-nodejs/src/modules/` to see every existing scoping site, so the portal guard reads like them.
- Grep for `ROLE_CODES.CUSTOMER` to confirm the three places customers are already special-cased before adding a fourth.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Who may use the portal** | Any authenticated caller whose `req.auth.customerId` is non-null. Role is **not** the test — the link is. A staff account that happens to be linked would work, and that is acceptable. |
| **Unlinked account** | A caller with a null `customerId` gets **403** on every portal route with a clear message. **Never** an empty list that looks like "you have no tickets", and never a fallback to unscoped data. |
| **Ownership** | `customerId` is taken from `req.auth` and **overwrites** anything in the query or body. A customer supplying another customer's id sees their own tickets, not a 403 — same shape as the existing branch scoping. |
| **Detail access** | Fetching a ticket whose `customerId` differs returns **404**, not 403. A customer must not be able to probe which ticket numbers exist. |
| **Channel** | Every ticket created through the form stores `channel: 'WEB'`, forced server-side. The body cannot set it. |
| **Branch and department** | Resolved from the **customer record's** `branchId` and a resolved default department — never from the request body. |
| **Notes** | A customer may add a note; it is forced to `isInternal: false`. Internal notes stay invisible on every read, which the existing code already guarantees. |
| **History** | Reuses `listHistory` with `includeInternal: false`, which `tickets.controller.ts` already derives from the role. |
| **Read-only lifecycle** | No portal route can transition, assign, reassign, edit, or delete a ticket. |
| **Reuse** | Every portal endpoint delegates to an existing service function. **No duplicated query, no duplicated business rule.** A new SQL query in this story is a defect unless it is the department resolution. |

---

## Backend Tasks

### 1 — Default department for portal tickets

`createTicket` requires a `departmentId` (`tickets.service.ts` ~line 33) and the `Customers` table has **no department column** — verified in `customer.entity.ts` (36 lines). The portal must therefore resolve one.

**File: `backend-nodejs/src/modules/departments/department.entity.ts`** — read it (28 lines) first; note `branchId`, `code`, and `isActive`.

Resolve in this order, in a helper `resolveIntakeDepartment(branchId): Promise<Department>` placed in the new portal service:
1. The active department in that branch with code `SUPPORT`.
2. Otherwise the active department in that branch with the lowest `code` (deterministic — **not** "the first row", which is unordered).
3. Otherwise throw `ConflictError('No active department is configured for this branch')` — a 409 the administrator can act on, rather than a 500.

Add a `SUPPORT` department to both seeded branches in `seed.ts` (~lines 147–160 is the existing department block) so step 1 succeeds out of the box.

### 2 — Carry `customerId` on the auth context

**File: `backend-nodejs/src/types/express.d.ts`**

Add to `AuthContext` (~lines 1–9):

```ts
/** Non-null only for an account linked to a Customers row. See Story 15. */
customerId: string | null;
```

**File: `backend-nodejs/src/modules/users/users.service.ts`**

`findByIdWithPermissions` (~lines 91–101) must select `customerId`. If it uses an explicit `.select([...])`, add the column; if it uses `findOne` with relations, it is already included — **read the function before editing** rather than assuming.

**File: `backend-nodejs/src/common/middleware/authenticate.ts`**

Add one line to the `req.auth` object (~lines 38–46):

```ts
customerId: found.user.customerId ?? null,
```

Because the user row is re-read on every request (~line 33), linking an account takes effect on the customer's **next request** — no re-login, no token change. Say so in a comment.

### 3 — The ownership guard

**Create file: `backend-nodejs/src/modules/portal/portal.guard.ts`**

```ts
/**
 * Resolves the Customers row this request acts for. The link — not the role —
 * is the test: an account with no customerId cannot reach the portal at all.
 * Fails closed with 403; it must NEVER return null or fall back to an
 * unscoped read.
 */
export function requirePortalCustomerId(req: Parameters<RequestHandler>[0]): string {
  const customerId = req.auth?.customerId ?? null;
  if (!customerId) {
    throw new ForbiddenError('This account is not linked to a customer record');
  }
  return customerId;
}
```

**Every** portal handler calls this as its first statement. There is no second path into portal data.

### 4 — Portal service

**Create file: `backend-nodejs/src/modules/portal/portal.service.ts`**

Thin delegations — the point of the file is that the ownership argument is applied once per call and cannot be forgotten:

- **`listMyTickets(customerId, filter)`** — calls `listTickets({ ...filter, customerId })`. The spread order matters: `customerId` is applied **last** so a caller-supplied one is overwritten, exactly as `tickets.controller.ts` overwrites `branchId` (~lines 56–58).
- **`getMyTicket(customerId, ticketId)`** — calls `findById`, then `if (ticket.customerId !== customerId) throw new NotFoundError('Ticket')`. **404, not 403.**
- **`createPortalTicket(customerId, actorUserId, input)`** — one flow:
  1. `findCustomerById(customerId)` from `customers.service.ts` (~lines 112–117); throw `ForbiddenError` when `isActive` is false.
  2. `resolveIntakeDepartment(customer.branchId)`.
  3. Resolve the priority: if `input.priorityCode` is given, look it up; otherwise default to `MEDIUM`. **The body carries a priority *code*, not an id** — a customer has no way to know ids.
  4. `createTicket({ subject, description, customerId, branchId: customer.branchId, departmentId, priorityId, categoryId, channel: TICKET_CHANNELS.WEB, actorUserId })`.
  5. Return the created ticket. The `TICKET_CREATED` audit row is written by `createTicket` itself (Story 15, task 6) — **do not** write a second one here.
- **`addMyNote(customerId, ticketId, authorUserId, body)`** — resolves ownership through `getMyTicket`, then `createNote(ticketId, authorUserId, body, false)`. The `false` is hard-coded; **no branch of this function can produce an internal note.**
- **`listMyTicketChildren`** — delegates to the existing `listNotes(ticketId, false)`, `listAttachments(ticketId)`, and `listHistory(ticketId, page, pageSize, false)`.
- **`getMyProfile(customerId)`** — `toPublicCustomer(await findCustomerById(customerId))`.

### 5 — Schemas

**Create file: `backend-nodejs/src/modules/portal/portal.schemas.ts`**

```ts
/**
 * The support web form. Deliberately does NOT accept customerId, branchId,
 * departmentId, or channel — all four are resolved from the account. A body
 * carrying them is stripped by Zod, not rejected.
 */
export const portalCreateTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  categoryId: z.string().uuid().nullish(),
  priorityCode: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const portalListTicketsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  statusId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ticketNumber']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const portalCreateNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
```

`portalListTicketsQuerySchema` deliberately omits `assignedUserId`, `unassigned`, `branchId`, and `priority` sorting — a customer has no use for them and every absent field is one less scoping mistake available.

### 6 — Controller and routes

**Create file: `backend-nodejs/src/modules/portal/portal.controller.ts`** and **`portal.routes.ts`**, following the layering in `tickets.routes.ts` (~lines 24–39).

| Method | Path | Permission | Delegates to |
|---|---|---|---|
| `GET` | `/api/v1/portal/me` | `tickets.read` | `getMyProfile` |
| `GET` | `/api/v1/portal/tickets` | `tickets.read` | `listMyTickets` |
| `POST` | `/api/v1/portal/tickets` | `tickets.create` | `createPortalTicket` |
| `GET` | `/api/v1/portal/tickets/:id` | `tickets.read` | `getMyTicket` |
| `GET` | `/api/v1/portal/tickets/:id/notes` | `tickets.read` | `listNotes(…, false)` |
| `POST` | `/api/v1/portal/tickets/:id/notes` | `tickets.create` | `addMyNote` |
| `GET` | `/api/v1/portal/tickets/:id/attachments` | `tickets.read` | `listAttachments` |
| `GET` | `/api/v1/portal/tickets/:id/attachments/:childId/download` | `tickets.read` | existing download handler |
| `GET` | `/api/v1/portal/tickets/:id/history` | `tickets.read` | `listHistory(…, false)` |
| `GET` | `/api/v1/portal/meta` | `tickets.read` | statuses, priorities, categories |

Notes on the choices:
- **`POST /tickets/:id/notes` is gated on `tickets.create`, not `tickets.update`.** A customer holds `tickets.create` after Story 15 and must never hold `tickets.update` — that permission carries transitions.
- **`/meta` returns only what a form needs**: categories and the four priority codes with their bilingual names. It does **not** return SLA policies or assignable users.
- The attachment download handler must call `requirePortalCustomerId` and `getMyTicket` **before** touching the filesystem, or a customer could read another customer's file by id. This is the single highest-risk route in the story.

**File: `backend-nodejs/src/routes/v1.ts`**

```ts
v1.use('/portal', portalRoutes);
```

### 7 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

- Add a `SUPPORT` department to both branches in the existing department block (~lines 147–160).
- Add a **second** customer login account, `customer2@azm.local`, linked to `CUST002`, alongside the existing `customer@azm.local` → `CUST001` link from Story 15. **Two linked accounts are what make the cross-customer isolation test meaningful** — with one, the test cannot distinguish correct scoping from an empty database.
- Ensure at least one demo ticket exists for `CUST002` so the isolation test has something to fail to see.

---

## Edge Cases & Failure Modes

- **An account with a null `customerId`.** Every portal route returns 403 from `requirePortalCustomerId` with an actionable message. Enforced in `portal.guard.ts` and nowhere else. **This must never degrade to an empty list** — an empty list reads as "you have no tickets" and hides a configuration error.
- **A customer requests another customer's ticket by id.** `getMyTicket` throws `NotFoundError` → **404**. A 403 would confirm the ticket exists and let a customer enumerate ticket ids.
- **A customer passes `?customerId=<other>` to the portal list.** Overwritten by the spread order in `listMyTickets`. Test it directly — the spread order is the whole guarantee, and reversing it silently exposes every ticket.
- **A customer passes `customerId` or `branchId` in the create body.** Stripped by Zod, because `portalCreateTicketSchema` has no such keys. Verify Zod strips rather than rejects, and assert it.
- **A customer's `Customers` row is deactivated.** `createPortalTicket` throws `ForbiddenError`. Reads still work — a deactivated customer can see their history but cannot open new work. State that choice in the service comment so it reads as intended.
- **The branch has no active department.** `resolveIntakeDepartment` throws `ConflictError` (409) with a message an administrator can act on. Without the guard, `createTicket` would fail on a null FK with an opaque 500.
- **Two departments tie on `code`.** Impossible — `department.entity.ts` has a unique index on `['branchId','code']` (~line 8). The ordering is therefore total, which is why "lowest code" is deterministic and "first row" would not be.
- **A customer replies to a `CLOSED` ticket.** Currently allowed — `createNote` has no status guard. That is acceptable for this scope, but it is a **decision, not an oversight**: record it in a comment on `addMyNote` so the next reader does not treat it as a bug.
- **Internal notes leaking.** Three separate paths could leak them: the notes list, the history merge, and a future search. The first two are already guarded by `includeInternal: false` (`ticketChildren.controller.ts` ~line 43, `tickets.controller.ts` ~line 210) and the portal passes `false` explicitly rather than relying on the role check. **Both layers must be tested** — a fix applied to one and not the other is the predictable regression.
- **A customer downloads an attachment on someone else's ticket.** Blocked only if the ownership check runs **before** the file is opened. Order the handler accordingly and assert it with a test that uses a real attachment id from another customer's ticket.
- **A customer account linked to a soft-deleted customer.** `findCustomerById` excludes soft-deleted rows and throws `NotFoundError`, so every portal route returns 404. Acceptable — the account is unusable, which is correct after the customer is removed.
- **The `MEDIUM` priority row missing.** `createPortalTicket` throws `NotFoundError('TicketPriority')`. The seed creates it (~lines 57–62); a database missing it is already broken for staff ticket creation too.
- **Concurrent form submissions.** Ticket numbering is already serialised by the pessimistic lock in `createTicket` (`tickets.service.ts` ~lines 129–135). The portal adds no new race.
- **Rate limiting.** The global `/api` limiter (`app.ts` ~lines 38–42) is 100 requests per 15 minutes per IP and covers the form. No per-route limiter is added; the endpoint is authenticated, so abuse is attributable.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/portal/__tests__/portal.schemas.spec.ts`.**
   - `portalCreateTicketSchema` **strips** `customerId`, `branchId`, `departmentId`, and `channel` from a body that supplies them, and the parsed result has none of those keys.
   - It rejects an empty `subject`, a 5000-character `description`, and `priorityCode: 'CRITICAL'`.
   - `portalListTicketsQuerySchema` has no `assignedUserId` or `unassigned` key.
   - `portalCreateNoteSchema` has **no** `isInternal` key.
2. **Unit — create `backend-nodejs/src/modules/portal/__tests__/portal.guard.spec.ts`.**
   - A request with `auth.customerId` set returns it.
   - `auth.customerId` null, `auth.customerId` undefined, and `auth` entirely absent each throw `ForbiddenError` with status 403.
3. **Integration — create `backend-nodejs/src/modules/portal/__tests__/portalTickets.itest.ts`.**
   - `GET /api/v1/portal/tickets` as `customer@azm.local` returns only `CUST001` tickets.
   - The same call with `?customerId=<CUST002 id>` **still** returns only `CUST001` tickets — the overwrite test.
   - `GET /api/v1/portal/tickets/:id` for a `CUST002` ticket returns **404**.
   - `GET /api/v1/portal/tickets` as an account with a null `customerId` returns **403** with a non-empty message, not `200` with an empty array.
   - Every returned ticket carries the `sla` object from Story 16.
   - `GET /api/v1/portal/me` returns the linked customer and no other.
4. **Integration — create `backend-nodejs/src/modules/portal/__tests__/portalCreate.itest.ts`.**
   - `POST /api/v1/portal/tickets` with only `subject` and `description` returns 201 with `channel: 'WEB'`, status `NEW`, priority `MEDIUM`, the customer's `branchId`, and the `SUPPORT` department.
   - A body carrying `customerId` of another customer creates the ticket against the **caller's** customer.
   - `priorityCode: 'URGENT'` is honoured.
   - A missing `subject` returns 422 with `details.subject`.
   - Creation writes exactly one `TICKET_CREATED` audit row — not two.
   - An account whose customer is inactive returns 403.
   - A branch with no active department returns 409.
5. **Integration — create `backend-nodejs/src/modules/portal/__tests__/portalIsolation.itest.ts`.** The security suite; it must fail loudly if scoping regresses:
   - Notes: a staff-authored `isInternal: true` note is absent from `GET /portal/tickets/:id/notes`, and present for the same ticket via the staff route.
   - History: the same internal note is absent from `GET /portal/tickets/:id/history` and present on the staff history route.
   - Attachments: `GET /portal/tickets/:otherId/attachments` returns 404.
   - Download: `GET /portal/tickets/:otherId/attachments/:childId/download` returns 404 **and no bytes** — assert on the response content type, not only the status.
   - `POST /portal/tickets/:id/notes` on another customer's ticket returns 404.
   - A note created through the portal has `isInternal: false` in the database.
   - No portal response body contains `passwordHash` — assert on the raw response text.
6. **Integration — create `backend-nodejs/src/modules/portal/__tests__/portalReadOnly.itest.ts`.**
   - There is no portal route that transitions, assigns, or deletes: `PATCH /api/v1/portal/tickets/:id/status`, `/assignee`, and `DELETE /api/v1/portal/tickets/:id` all return **404** from the not-found handler.
   - A customer calling the **staff** routes directly — `PATCH /api/v1/tickets/:id/status` and `/assignee` — gets **403**, because `CUSTOMER` holds neither `tickets.update` nor `tickets.assign`.
7. **Regression:** re-run the Story 11–13 and Story 16–17 suites. This story adds `customerId` to `AuthContext` and a module; **no existing ticket or customer test may change**.

---

## Migration / Rollback

- **No migration.** This story adds no column and no table — `Users.customerId` arrived with Story 15 and `Tickets.channel` with it.
- `npm run db:seed` must be re-run to create the `SUPPORT` departments and the `customer2@azm.local` account. The seed is idempotent; re-running it is safe.
- Rollback is a code revert plus removing the `/portal` mount from `v1.ts`. No data is lost — every row the portal creates is an ordinary ticket or note that the staff screens continue to show.
- **Half-applied state:** if the `AuthContext` change ships without the `authenticate` edit, `req.auth.customerId` is `undefined` and every portal route returns 403. Fails closed, which is the correct direction.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Then `SELECT email, customerId FROM Users WHERE customerId IS NOT NULL` returns exactly two rows, and `SELECT code FROM Departments WHERE code = 'SUPPORT'` returns two.
3. **Unit tests:** `npm test` in `backend-nodejs/`.
4. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
5. **Backend runs:** `npm run dev` in `backend-nodejs/`, then signed in as `customer@azm.local`:
   - `GET /api/v1/portal/me` → the `CUST001` record.
   - `GET /api/v1/portal/tickets` → only `CUST001` tickets, each with an `sla` object.
   - `POST /api/v1/portal/tickets` with `{"subject":"Cannot sign in","description":"Password rejected"}` → 201, `channel: "WEB"`, priority `MEDIUM`.
   - `GET /api/v1/portal/tickets/<a CUST002 ticket id>` → 404.
   - `POST /api/v1/portal/tickets/<own id>/notes` → 201, and the staff view shows the note as **not** internal.
   - `GET /api/v1/kb/articles` → published articles only (Story 17 already guarantees this; confirm the portal needs no KB route).
6. **Unlinked check:** sign in as `agent@azm.local` and call `GET /api/v1/portal/tickets` → **403**, not an empty list.
7. **Swagger:** `GET /api/docs` lists the Portal tag with every route above and **no** lifecycle route.
8. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `AuthContext.customerId` exists and is populated by `authenticate` on every request.
- [ ] Linking an account takes effect without a re-login.
- [ ] `requirePortalCustomerId` is the **only** way into portal data, and it fails closed with 403.
- [ ] An unlinked account gets 403, never an empty list.
- [ ] Portal list scoping **overwrites** a caller-supplied `customerId`.
- [ ] Fetching another customer's ticket, notes, attachments, history, or download returns **404**.
- [ ] The download handler checks ownership before opening the file, and returns no bytes on failure.
- [ ] `POST /portal/tickets` resolves customer, branch, department, and channel from the account, and forces `channel: 'WEB'`.
- [ ] The form body cannot set `customerId`, `branchId`, `departmentId`, or `channel`.
- [ ] `priorityCode` is accepted by code and defaults to `MEDIUM`.
- [ ] A branch with no active department returns 409, not 500.
- [ ] A customer's note is always `isInternal: false`, with no code path that can produce otherwise.
- [ ] Internal notes are absent from both the portal notes list and the portal history.
- [ ] Ticket creation through the portal writes exactly one audit row.
- [ ] No portal route can transition, assign, edit, or delete a ticket, and a customer calling the staff lifecycle routes gets 403.
- [ ] Every portal endpoint delegates to an existing service function; the only new query is the department resolution.
- [ ] The seed creates `SUPPORT` departments and a second linked customer account.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 19.**
