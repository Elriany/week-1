# Story 28 — Module Integration, Security Sanity & Final Verification (Story: 28)

## Prerequisites

- **Stories 24–27 completed** — the build and test gate is green ([24](24-story-build-and-test-baseline-28.md)), the dead code is gone ([25](25-story-dead-code-and-duplication-sweep-28.md)), the design language is consistent ([26](26-story-design-system-pass-28.md)), and navigation and accessibility are settled ([27](27-story-navigation-clarity-and-accessibility-28.md)).
- **Story 27 left the customer detail layout with the placeholder card removed** and the slot where the two panels in task 1 belong.
- **A SQL Server instance with the schema migrated and seeded.** This story runs the integration suite and the manual end-to-end scenario, both of which need a live database: `npm run db:create`, `npm run migration:run`, `npm run db:seed` in `backend-nodejs/`.

**This is the final story for work item 28.**

---

## Story Goal

Work item tasks 2 ("Module Integration Review"), 9 ("Data & Security Sanity Check"), 10 ("Testing & Final Verification"), and the remainder of 11:

1. **Connect the one module that is built on the server and invisible in the browser** — customer attachments and interaction history. Four backend endpoints, a service, an integration test, and **23 translated i18n keys in both locale files**, with no screen.
2. **Verify role-based access and customer data isolation** against a written matrix, not by assumption.
3. **Close the two configuration weaknesses** that would embarrass a demo: a production-usable default for `JWT_SECRET`, and a rate limit low enough to break a normal session.
4. **Run the integration suite** — seven `.itest.ts` files that the unit gate never touches.
5. **Walk the full customer-to-resolution journey** in both languages, end to end, and fix what it surfaces.

**Not in scope:**
- New features. Every endpoint task 1 consumes already exists, is tested, and has translated strings waiting for it.
- A security programme. The work item explicitly says "focus on obvious application-level issues".
- Schema changes, new permissions, new roles. `permissions.constants.ts` is untouched by this whole feature.
- Anything the earlier four stories own. A visual inconsistency found here is reported, not restyled.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/customers/customers.routes.ts` — the four routes Story 25 moved into the controller: `GET /:id/attachments` (~line 474), `POST /:id/attachments` (~517), `DELETE /:id/attachments/:attachmentId` (~602), `GET /:id/history` (~642). All four are live, permission-gated, and unreachable from the UI.
2. `backend-nodejs/src/modules/customers/customerHistory.service.ts` — **lines 8–26** for `HistoryKind` (`'ticket' | 'note' | 'attachment'`) and the `HistoryEntry` shape: `kind`, `id`, `occurredAt`, `title`, `reference`, `statusEn`, `statusAr`, `actor`. `getHistory` at line 110 returns `PagedHistory`.
3. `backend-nodejs/src/modules/customers/customerAttachments.service.ts` — `listAttachments`, `createAttachment`, `findAttachmentById`, and `toPublicAttachment`.
4. `frontend-vuejs/src/i18n/locales/en.json` — `customers.attachments.*` (**16 keys**: `title`, `upload`, `download`, `delete`, `confirmDelete`, `maxSize`, `allowedTypes`, `columns.{name,size,uploader,date,actions}`, `empty.{title,description}`, `errors.{tooLarge,unsupportedType}`) and `customers.history.*` (**7 keys**: `title`, `loadMore`, `kind.{ticket,note,attachment}`, `empty.{title,description}`). Both namespaces are fully translated in `ar.json` and rendered by nothing.
5. `frontend-vuejs/src/components/tickets/TicketAttachmentsList.vue` — the **whole file**. The working attachments panel: `BaseCard` header with an upload toggle, a table, an `EmptyState`, download and delete emitted to the parent. Its i18n keys are hardcoded to the `tickets.attachments.` prefix and its `Attachment` interface carries a `ticketId`.
6. `frontend-vuejs/src/views/TicketDetailView.vue` — how that component is wired: the parent owns the fetch, the download, and the delete confirmation. Copy this division of labour.
7. `frontend-vuejs/src/views/CustomerDetailView.vue` — the region Story 27 cleared, after the notes card. The existing `loadContacts` / `loadNotes` functions are the pattern the two new loaders follow.
8. `backend-nodejs/src/config/env.ts` — **line 17**: `JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-in-production')`. A default, in a schema that otherwise fails closed.
9. `backend-nodejs/src/app.ts` — **lines 38–42**: `rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })` applied to all of `/api`.
10. `backend-nodejs/src/modules/portal/portal.guard.ts` — the **whole file** (16 lines). `requirePortalCustomerId` fails closed on a null `customerId`. The isolation contract task 2 verifies.
11. `backend-nodejs/src/modules/admin/admin.guard.ts` — the **whole file** (14 lines). `requireAdministrator`, the second gate over `admin.manage`.
12. `backend-nodejs/src/common/middleware/authenticate.ts` — the **whole file** (55 lines). The user row is re-read on every request, so deactivation and customer-linking take effect immediately. Task 2's matrix depends on this.
13. `frontend-vuejs/src/router/index.ts` — **lines 161–168**. The comment records that a `CUSTOMER` holds `tickets.read` and that the router redirect is a **frontend-only** mitigation, with the durable fix left to a backend permission. Task 2 decides whether that gap is still acceptable.
14. `backend-nodejs/vitest.config.ts` — the `unit` and `integration` projects. `integration` runs `*.itest.ts` with `fileParallelism: false` and a 30 s timeout.
15. [../completion/00-overview.md](../completion/00-overview.md) — the **Dependency notes** section. It records the contracts this story verifies: SLA computed on read, the internal-note rule, hidden content returning 404 rather than 403, and the nine-step end-to-end scenario Story 23 defined.

Grep targets:
- `grep -rn "customers/.*attachments\|customers/.*history" frontend-vuejs/src/` — **returns nothing today.** That is the gap.
- `grep -rn "v-html" frontend-vuejs/src/` — must stay empty; it is a standing invariant from Story 22.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Customer attachments** | Read requires `customers.read`; upload and delete require `customers.update`. The server already enforces this — the UI must **hide** the controls rather than let them 403. |
| **Customer history** | Read-only. A `ticket` entry links to the ticket detail page; `note` and `attachment` entries do not link anywhere. |
| **Branch scoping** | A non-Administrator sees only their own branch's customers. Already enforced by `isUnscoped` in the controller; the new panels inherit it because they hang off a customer the user could already open. |
| **Portal isolation** | A `CUSTOMER` account reaches **only** its own linked customer's data. An unlinked account gets **403 from every portal route** — never an empty list, which would read as "you have no tickets". |
| **Hidden content is 404, not 403** | Another customer's ticket, a draft KB article, and their child resources return 404. A 403 lets a caller probe for existence. |
| **No new permission code** | The matrix is verified against the permissions that exist. If a gap needs a new code, **record it and stop** — introducing one changes the seed and is out of scope for a final-review story. |
| **Configuration fails closed in production** | A secret with a known default is not a secret. |
| **A found defect outside this story's tasks is reported, not fixed** | Unless it blocks the end-to-end scenario. Then fix it and say so in the commit. |

---

## Frontend Tasks

### 1 — Connect customer attachments and interaction history

This is the work item's task 2 in its clearest form: two modules that share entities and APIs correctly on the server and are not connected in the UI.

#### 1a — Generalise the attachments panel

**Rename `frontend-vuejs/src/components/tickets/TicketAttachmentsList.vue` to `frontend-vuejs/src/components/common/AttachmentsList.vue`.**

Add one prop and change nothing else about its behaviour:

```ts
interface Props {
  // … existing props unchanged …
  /**
   * i18n namespace for this panel's strings. Both `tickets.attachments.*` and
   * `customers.attachments.*` already exist with identical key sets, so the
   * component reads one prefix instead of carrying two copies of the markup.
   */
  i18nPrefix?: string
}
```

defaulting to `'tickets.attachments'`, and replace each `t('tickets.attachments.x')` with `t(\`${i18nPrefix}.x\`)`. Widen the `Attachment` interface's `ticketId` to an optional `ownerId` — or simply drop the field, since the template never renders it.

**One prop, one component, no registry and no factory.** Writing a second near-identical `CustomerAttachmentsList.vue` would be the duplication this feature exists to remove; a prefix prop is the smaller change.

Update the import in `TicketDetailView.vue` and `PortalTicketDetailView.vue`, and move `TicketAttachmentsList.spec.ts` to `src/components/common/__tests__/AttachmentsList.spec.ts` with its import path corrected. **Its assertions must not change** — the default prefix keeps the ticket behaviour identical.

**Verify the key sets match before starting:**

```bash
node -e "const e=require('./src/i18n/locales/en.json');const f=o=>JSON.stringify(Object.keys(o).sort());console.log(f(e.tickets.attachments),f(e.customers.attachments))"
```

If they differ, add the missing keys to **both** locale files first — `locale-parity.spec.ts` enforces the pairing.

#### 1b — Create the history panel

**Create file: `frontend-vuejs/src/components/customers/CustomerHistoryList.vue`**

A `BaseCard` titled `t('customers.history.title')` over a chronological list of `HistoryEntry` rows. Per row: a kind badge from `t(\`customers.history.kind.${entry.kind}\`)`, the `title`, the localized status (`statusEn` / `statusAr` through `useLocalizedName`), the `actor` name, and `occurredAt` through `useFormat`. A `ticket` entry wraps its title in a `RouterLink` to `ticket-detail`; `note` and `attachment` entries render as plain text.

Paged: `GET /customers/:id/history?page=N&pageSize=20`, with a `t('customers.history.loadMore')` button while `items.length < total`. `EmptyState` with `customers.history.empty.*` when there are none. `requestSeq`-guarded, like every other fetch in the project.

Map the kind badge onto a `BadgeVariant` from `src/types/ui.ts` — reuse the `ticketBadges.ts` module's shape rather than inventing a third mapping style.

#### 1c — Mount both on the customer detail page

**File: `frontend-vuejs/src/views/CustomerDetailView.vue`** — in the region Story 27 cleared:

```vue
<AttachmentsList
  i18n-prefix="customers.attachments"
  :attachments="attachments"
  :loading="attachmentsLoading"
  :can-upload="auth.can('customers.update')"
  @upload="uploadAttachment"
  @download="downloadAttachment"
  @delete="confirmDeleteAttachment"
/>
<CustomerHistoryList :customer-id="customer.id" />
```

The parent owns the four calls, matching how `TicketDetailView.vue` drives the ticket panel:

- `GET /customers/:id/attachments`
- `POST /customers/:id/attachments` via `api.upload(endpoint, formData)`
- `DELETE /customers/:id/attachments/:attachmentId`, behind a `BaseDialog` confirmation using `customers.attachments.confirmDelete`
- `api.download('/customers/:id/attachments/:attachmentId/download')`, if that route exists — **check `customers.routes.ts` first**; if there is no download route, render the file name without a download action rather than adding a backend endpoint.

Map the two upload failures the server can return to their existing keys: **413** → `customers.attachments.errors.tooLarge`, **422** with a `file` detail → `customers.attachments.errors.unsupportedType`. Pass them as `ERROR_OVERRIDES` to `messageFor`, the pattern `CustomersView.vue:220–228` establishes.

Hide the upload and delete controls without `customers.update` — the server enforces it, but a button that always 403s is a dead button.

---

## Backend Tasks

### 2 — Verify access control against a written matrix

No code change unless the matrix finds a gap. Sign in as each seeded account (`admin@`, `manager@`, `supervisor@`, `agent@`, `customer@`, `riyadh.agent@`, password `Passw0rd!` per `LoginView.vue:96`) and record the actual response for each cell.

| Surface | Administrator | Manager | Supervisor | Agent | Customer |
|---|---|---|---|---|---|
| `GET /users` | 200 all | 200 own branch | per `users.read` | 403 | 403 |
| `PATCH /users/:id/customer` | 200 | 200 | 403 | 403 | 403 |
| `GET /customers` | 200 all branches | 200 own branch only | own branch | own branch | 403 |
| `GET /customers/:id` — another branch | 200 | **403 or 404** | 403/404 | 403/404 | 403 |
| `GET /tickets` | 200 all | own branch | own branch | own branch | see note |
| `GET /portal/tickets` — linked account | 403 (no link) | 403 | 403 | 403 | **200, own customer only** |
| `GET /portal/tickets` — unlinked account | 403 | 403 | 403 | 403 | **403, never `[]`** |
| `GET /portal/tickets/:id` — another customer's ticket | — | — | — | — | **404, not 403** |
| `POST /admin/branches` | 201 | **403** (role gate) | 403 | 403 | 403 |
| `PATCH /admin/:kind/:id` | 200 | 200 | 403 | 403 | 403 |
| `GET /audit` | 200 | per `audit.read` | 403 | 403 | 403 |
| `GET /kb?status=draft` | 200 | 200 | per `kb.manage` | 404 on the draft | 404 on the draft |
| `GET /reports/*` | 200 | 200 | per `reports.read` | 403 | 403 |

Test with **curl or the REST client, not the UI** — the UI hides controls, which is exactly what a permission test must not rely on.

**The `tickets.read` note.** `router/index.ts:161–168` records that a `CUSTOMER` holds `tickets.read`, so `GET /api/v1/tickets` is reachable by a customer with a token, and only a **frontend** redirect stands between them and other customers' tickets in their branch. Confirm this is still true. If it is:

- Record it explicitly in the commit message and in a comment on the route.
- **Do not add a new permission code** — that changes `permissions.constants.ts` and forces a re-seed, which this story's scope excludes.
- **Do** add a branch-and-role guard on the staff list route: if `req.auth.roleCode === ROLE_CODES.CUSTOMER`, throw `ForbiddenError` and point the caller at `/portal/tickets`. It uses the role already on `req.auth`, adds no permission, and closes the hole on the server where it belongs.

### 3 — Make `JWT_SECRET` fail closed in production

**File: `backend-nodejs/src/config/env.ts`** — line 17.

`JWT_SECRET` carries `.default('dev-only-secret-change-me-in-production')`. Every other setting with a safe default is genuinely safe to default; a signing key is not. As written, a production deployment that forgets the variable boots successfully and signs tokens with a value that is in the repository.

Keep the developer convenience, remove the production hazard — refuse to start when `NODE_ENV === 'production'` and the secret is still the default:

```ts
const parsed = schema.safeParse(process.env);
// … existing failure handling …

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEV_JWT_SECRET) {
  console.error('JWT_SECRET must be set explicitly in production.');
  process.exit(1);
}
```

with `DEV_JWT_SECRET` as a named constant used in both places. `env.spec.ts` exists — add the case there.

### 4 — Raise the rate limit to something a session survives

**File: `backend-nodejs/src/app.ts`** — lines 38–42.

`max: 100` per **15 minutes** per IP, across **all** of `/api`. A single sign-in plus a walk through the dashboard, the tickets list, a ticket detail with its notes, history, and attachments, and the reference-data priming each screen does will consume a meaningful fraction of that budget, and every request from the Vite dev proxy arrives from **one** IP. A demo that starts returning 429 halfway through is the worst possible failure mode for this work item.

Raise the general limit to a value a real session cannot hit (600 per 15 minutes is ample for one user and still bounds abuse), and add a **second, tighter limiter on `/api/v1/auth/login` only** — that is the endpoint where a low limit is actually protective:

```ts
// Broad limit: bounds abuse without interfering with a normal session. One
// screen can issue a dozen calls, and the dev proxy makes every client one IP.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
app.use('/api', apiLimiter);

// Sign-in is the endpoint worth throttling hard.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/v1/auth/login', loginLimiter);
```

Register `loginLimiter` **before** `app.use('/api/v1', v1)` so it takes effect. Confirm a 429 still returns the standard error envelope through `errorHandler`; if `express-rate-limit` bypasses it and sends its own plain-text body, supply a `handler` that calls `next(new AppError(429, …, 'RATE_LIMITED'))` — the work item's task 4 asks for standardised error responses, and 429 is the one that currently escapes.

### 5 — Run the integration suite

`npm run test:integration` in `backend-nodejs/` runs seven `.itest.ts` files that the unit gate never touches: `app.itest.ts`, `audit.itest.ts`, `database.itest.ts`, `customers.itest.ts`, `customerContacts.itest.ts`, `customerNotes.itest.ts`, `ticket*.itest.ts`, `userCustomerLink.itest.ts`.

Run against a **freshly created, migrated, and seeded** database:

```bash
npm run db:create && npm run migration:run && npm run db:seed && npm run test:integration
```

Fix every failure. **Classify each one in the commit message** as (a) caused by Stories 24–27, (b) pre-existing and now visible, or (c) a test that encodes stale behaviour. Category (a) is a regression and must be fixed in the code; (c) is fixed in the test with the reason stated.

Note that Stories 24, 25, and 28 all change endpoints these tests cover: the `correlationId` field on customer responses, the 404 → 422 change on attachment upload, the paging schema on history, and the rate limits. Expect (a) and (c) hits and budget for them.

---

## Edge Cases & Failure Modes

- **`GET /customers/:id/history` merges three sources and pages the merged result.** `customerHistory.service.ts:28` fetches **all** of a customer's tickets before merging. For a demo dataset that is fine; for a customer with thousands of tickets it loads them all into memory to return twenty. **Record this in a code comment as a known limit and do not rewrite it** — the work item forbids scope expansion, and a three-source SQL union is exactly the complexity it warns against.
- **`HistoryEntry.actor` is nullable.** A ticket created through the public web form has none. Render an em dash, matching how `AttachmentsList` handles a null uploader.
- **A history entry whose `kind` is not one of the three known values** renders `customers.history.kind.<unknown>` as a raw key. Fall back to the raw `kind` string, the same rule `AuditView.vue` applies to an unknown audit action.
- **Uploading to a customer in another branch.** The panel is only reachable from a customer detail page the user could already open, so scope is inherited — but confirm the server still checks, because inheriting a guard through the UI is not a guard.
- **The i18n prefix prop takes a runtime string.** A typo produces a raw key on screen, not a build error. The key-set comparison in task 1a is the guard; run it, and add an assertion to the component spec that the customer prefix renders real text.
- **Renaming `TicketAttachmentsList.vue` breaks two importers and one spec path.** `TicketDetailView.vue`, `PortalTicketDetailView.vue`, and `TicketAttachmentsList.spec.ts`. Grep for the old name after the move; a Vue SFC import failure surfaces at navigation, not at typecheck.
- **The `CUSTOMER` guard on `GET /tickets` may break a seeded flow.** The seed calls `transitionTicket` and `assignTicket` directly, not over HTTP, so it is unaffected — but `ticketLifecycle.itest.ts` may authenticate as a customer. Check before adding the guard.
- **Raising the rate limit weakens brute-force protection if the login limiter is misregistered.** `app.use('/api/v1/auth/login', loginLimiter)` must come **before** `app.use('/api/v1', v1)`; registered after, it never runs. Verify with eleven consecutive bad logins — the eleventh must be 429 while a concurrent `GET /api/v1/health` still succeeds.
- **The `JWT_SECRET` guard can break a CI run.** If any pipeline sets `NODE_ENV=production` without a secret, it will now exit 1 — which is correct, and is the point. Check `env.spec.ts` and any Docker or CI configuration before committing.
- **`npm run db:seed` must be re-run after any change to `permissions.constants.ts`.** This story changes none, so no re-seed is required — if you find yourself re-seeding, something went outside scope.
- **The integration suite runs with `fileParallelism: false` against a real database.** Running it while the dev server is up against the same database will produce confusing failures. Stop `npm run dev` first.

---

## Test Plan

1. **Move** `frontend-vuejs/src/components/tickets/__tests__/TicketAttachmentsList.spec.ts` to `src/components/common/__tests__/AttachmentsList.spec.ts`, correcting the import path only. **Every assertion unchanged** — the default prefix preserves the ticket behaviour.
2. **Add** to that spec — mount with `i18nPrefix="customers.attachments"` and assert the header renders the customer title, not the ticket one, and that no raw key (`customers.attachments.`) appears in the output.
3. **Add** `frontend-vuejs/src/components/customers/__tests__/CustomerHistoryList.spec.ts` — renders a mixed list of all three kinds; a `ticket` entry links to `ticket-detail` and the other two do not; a null `actor` renders an em dash; an unknown `kind` falls back to the raw string; `loadMore` appears only while `items.length < total`; a stale response does not overwrite a newer one.
4. **Add** to `frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts` — both panels render; upload and delete controls are **absent** without `customers.update`; a 413 shows `tooLarge` and a 422 shows `unsupportedType`.
5. **Add** to `backend-nodejs/src/config/__tests__/env.spec.ts` — `NODE_ENV=production` with the default `JWT_SECRET` exits non-zero; with an explicit secret it parses.
6. **Add** `backend-nodejs/src/__tests__/rateLimit.spec.ts` (unit) — eleven POSTs to `/api/v1/auth/login` yield a 429 on the eleventh, and the 429 body matches the standard `{ success: false, error: { code, message }, correlationId }` envelope.
7. **Add** to `backend-nodejs/src/modules/tickets/__tests__/tickets.itest.ts` (or a new `ticketAccess.itest.ts`) — a `CUSTOMER` token against `GET /api/v1/tickets` receives **403**, and the same token against `GET /api/v1/portal/tickets` receives 200 with only its own customer's rows.
8. **Add** to `backend-nodejs/src/modules/portal/__tests__/` — an **unlinked** `CUSTOMER` account gets 403 (not `[]`) from every portal route, and a linked one gets 404 (not 403) for another customer's ticket. These two are the isolation contract; they are worth a dedicated file.
9. **Run the whole suite:** `npm run test:all` in `backend-nodejs/` — both projects, unit and integration.
10. **Run unchanged and expect green:** every frontend spec and `locale-parity.spec.ts`.

---

## Verification Steps

1. **Backend builds and typechecks:** `npm run build` and `npm run typecheck` in `backend-nodejs/`.
2. **Backend unit tests:** `npm test` in `backend-nodejs/`.
3. **Backend integration tests:** `npm run test:integration` in `backend-nodejs/`, against a freshly created, migrated, and seeded database. **All seven files pass.**
4. **Frontend typechecks, tests, lints, builds:** `npm run type-check`, `npx vitest run`, `npm run lint`, `npm run build` in `frontend-vuejs/`.
5. **Clean startup:** `npm run dev` in `backend-nodejs/` — reaches "listening" with **no warning and no error** in the log. Then `npm run dev` in `frontend-vuejs/` — Vite starts and the browser console is clean on first paint.
6. **No orphan i18n namespace:** `grep -rn "customers.attachments\|customers.history" frontend-vuejs/src --include=*.vue` now returns hits.
7. **No raw HTML:** `grep -rn "v-html" frontend-vuejs/src/` returns nothing.
8. **Access matrix:** every cell in task 2's table verified with curl and the actual status recorded. Any deviation is either fixed or written up.
9. **Rate limits:** eleven bad logins produce a 429 with the standard envelope; a normal signed-in session walking every screen twice produces none.
10. **Production config fails closed:** `NODE_ENV=production npm start` without `JWT_SECRET` exits 1 with a clear message.
11. **End-to-end scenario, in English then in Arabic:**
    1. Sign in as `customer@azm.local`; land on `/portal`, not the staff dashboard.
    2. File a request from the portal form; it appears in the customer's own list with an SLA target.
    3. Sign in as `agent@azm.local`; find that ticket on the dashboard and open it.
    4. Consult a Knowledge Base article from the ticket workspace.
    5. Assign the ticket and add an **internal** note; confirm the response clock does **not** stop.
    6. Add a **customer-visible** note; confirm the clock stops and the customer can see it in the portal while the internal note stays hidden.
    7. Move the ticket to Resolved; confirm the SLA badge settles and the audit log records the transition.
    8. Sign in as `admin@azm.local`; open the customer's detail page — **contacts, notes, attachments, and interaction history all render**, and the history shows that ticket.
    9. Upload an attachment to the customer, download it back, delete it, and confirm the history reflects it.
    10. Check `/reports` and `/audit` for the run; the numbers agree with what you just did.
12. **Regression on US01–US04:** sign in as each seeded role and walk users, roles, customers, and the staff ticket lifecycle. **Nothing from the earlier work items may have regressed** — a Definition-of-Done item on the work item itself.
13. **Bilingual and responsive:** repeat step 11 in Arabic and at 1440, 1024, and 768 px.

---

## Done Criteria

- [ ] The customer detail page renders attachments and interaction history; no backend endpoint or translated key in the customers module is unreachable from the UI.
- [ ] `AttachmentsList` is one component serving both tickets and customers, and the ticket spec's assertions are unchanged.
- [ ] Upload and delete controls are hidden without `customers.update`; 413 and 422 map to their existing messages.
- [ ] The history panel pages, links only `ticket` entries, and handles a null actor and an unknown kind.
- [ ] Every cell of the access matrix is verified against the running API and recorded.
- [ ] An unlinked customer account gets **403** from the portal, never an empty list.
- [ ] Another customer's ticket returns **404**, not 403.
- [ ] `GET /api/v1/tickets` refuses a `CUSTOMER` token on the server, not only in the router.
- [ ] Production startup without an explicit `JWT_SECRET` exits non-zero.
- [ ] The general rate limit does not fire during a normal session; the login limiter fires on the eleventh attempt and returns the standard error envelope.
- [ ] `npm run test:all` passes in `backend-nodejs/`, integration included, and every failure is classified in the commit.
- [ ] Every frontend test passes; `locale-parity.spec.ts` passes.
- [ ] Both projects build; both start with a clean log and a clean browser console.
- [ ] The full end-to-end scenario passes in English **and** Arabic, at desktop and tablet widths.
- [ ] US01–US04 functionality is confirmed unregressed.
- [ ] No new permission, role, migration, dependency, or external service was introduced anywhere in Stories 24–28.

**This is the final story for work item 28. Report completion to the user.**
