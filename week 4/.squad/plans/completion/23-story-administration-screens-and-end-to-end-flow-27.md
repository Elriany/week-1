# Story 23 — Administration Screens, Audit Viewer & End-to-End Flow (Story: 27)

## Prerequisites

- **Story 20 completed** ([20-story-administration-apis-27.md](20-story-administration-apis-27.md)) — every `/api/v1/admin/*` route exists, `PATCH /users/:id/customer` links accounts, reference statuses are rename-only, and `GET /tickets/meta` now returns active categories and priorities only.
- **Story 19 completed** ([19-story-dashboard-and-reporting-apis-27.md](19-story-dashboard-and-reporting-apis-27.md)) — `GET /api/v1/audit` exists, paged and filterable, gated on `audit.read`.
- **Story 21 completed** ([21-story-agent-workspace-and-management-dashboard-27.md](21-story-agent-workspace-and-management-dashboard-27.md)) — the agent workspace and `/reports`.
- **Story 22 completed** ([22-story-knowledge-base-and-customer-portal-screens-27.md](22-story-knowledge-base-and-customer-portal-screens-27.md)) — the Knowledge Base, the customer portal, the role-aware sidebar, and the three extracted ticket child components.

**This is the final story for work item 27.** It is frontend-first, with an explicit integration and cleanup pass at the end.

---

## Story Goal

Close out the feature:

1. **Administration screens** — branches, departments, ticket categories, priorities, and statuses, each honouring the rules Story 20 enforces server-side.
2. **Customer account linking from the Users screen** — the operation the whole portal depends on, currently reachable only through the seed or a raw API call.
3. **An audit log viewer** — filterable, paged, gated on `audit.read`.
4. **An SLA policy editor** — the read-and-write surface for the four policies from Story 16.
5. **End-to-end verification** of the full flow: customer signs in → files a request → agent picks it up → uses the Knowledge Base → SLA tracks it → resolves it → customer sees the outcome.
6. **A duplication sweep** — remove logic that got copied during Stories 15–22, per the work item's task 10.

**Not in scope:**
- Any backend change. If a gap appears, fix it in the story that owns it.
- Editing the transition graph, permissions, or role mappings. Story 20 established those are code, not data.
- User CRUD beyond the customer-link field — that screen already exists.
- Charts, export, or bulk operations.

---

## Context — Read These Files First

1. `frontend-vuejs/src/views/UsersView.vue` — the **whole file** (352 lines). The smallest complete CRUD screen in the project and the closest template for every administration screen here: table, `BaseDialog` create form, permission-gated actions, and the row-level activate/deactivate toggle. Task 3 extends this file.
2. `frontend-vuejs/src/views/CustomersView.vue` — the **whole file** (501 lines). The larger list pattern: `requestSeq` (~lines 251, 268, 279, 283, 286), the 300 ms debounce that resets the page (~line 293), `messageFor()` (~lines 258–266), and the delete-confirmation `BaseDialog`.
3. `frontend-vuejs/src/views/RolesView.vue` — the **whole file** (136 lines). A read-only reference screen; the audit viewer is closest to this in shape.
4. `frontend-vuejs/src/router/index.ts` — the routes array and the guard, including the two redirects Story 22 added. Task 1 appends to both.
5. `frontend-vuejs/src/components/layout/AppSidebar.vue` — `navItems` and the `visibleNavItems` filter as extended by Story 22 with `roles` / `excludeRoles`.
6. `frontend-vuejs/src/components/ui/BaseDialog.vue` — the modal used by `UsersView.vue` and `CustomersView.vue`. Every form in this story uses it.
7. `frontend-vuejs/src/api/client.ts` — `api.get/post/patch` (~lines 165–177) and the `ApiError` shape carrying `status`, `code`, and `details` (`types/api.ts` ~lines 11–25). Story 20 returns 409 for several refusals; each needs its own message.
8. `frontend-vuejs/src/views/__tests__/CustomersView.spec.ts` — the test harness to copy.
9. `frontend-vuejs/src/i18n/locales/en.json` / `ar.json` — 401 lines each before Stories 21–22; both grew. `nav` at ~lines 18–26.
10. `frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts` — the parity and non-empty assertions.
11. `frontend-vuejs/src/composables/useTicketFilters.ts` — extended by Story 21 with `slaStatus`. Referenced by the cleanup pass.
12. `frontend-vuejs/src/components/tickets/` — the three components Story 22 extracted, plus `SlaBadge.vue` from Story 21. The cleanup pass checks nothing was re-inlined beside them.

Grep targets:
- Grep for `messageFor` in `frontend-vuejs/src/views/` — count the copies. The cleanup pass consolidates them.
- Grep for `requestSeq` in `frontend-vuejs/src/` — every guarded fetch. Any new view lacking one is a defect.
- Grep for `api.get('/tickets/meta')` — every screen priming reference data; a candidate for one shared composable.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Administration visibility** | The Administration section appears only with `admin.manage`. Branch create/edit additionally requires the Administrator **role**, matching Story 20's second gate — a Manager sees the branch list but no write controls. |
| **Statuses are rename-only** | The statuses screen offers rename and reorder. **No create button, no deactivate toggle** — not disabled ones, absent ones. The reason is shown as an inline note so an administrator does not think it is broken. |
| **Codes are immutable** | Every edit form shows `code` as read-only text, never as an input. |
| **Deactivation refusals** | Story 20's 409s each get a specific message naming what blocked it: active users, open tickets, or an SLA policy. The generic banner is not acceptable for these. |
| **Customer linking** | Offered only on `CUSTOMER`-role rows. A 409 ("already linked") and a 422 ("not a customer role") each get their own message. |
| **Audit viewer** | Read-only. No row is clickable unless its `entityType` is `Ticket` and its `entityId` resolves to a route the viewer can reach. |
| **Stale responses** | Every fetch is `requestSeq`-guarded. |
| **Bilingual** | Identical key sets in both locale files; no empty Arabic value. |
| **No duplication** | The cleanup pass is a deliverable, not a nicety. Each consolidation must leave every existing test passing unchanged. |

---

## Frontend Tasks

### 1 — Routes and sidebar

**File: `frontend-vuejs/src/router/index.ts`**

Add inside the `AppLayout` children array:

```ts
{
  path: 'admin',
  name: 'admin',
  component: () => import('@/views/admin/AdminView.vue'),
  meta: { titleKey: 'nav.admin', permission: 'admin.manage' },
},
{
  path: 'admin/sla',
  name: 'admin-sla',
  component: () => import('@/views/admin/SlaPoliciesView.vue'),
  meta: { titleKey: 'nav.sla', permission: 'sla.manage' },
},
{
  path: 'audit',
  name: 'audit',
  component: () => import('@/views/AuditView.vue'),
  meta: { titleKey: 'nav.audit', permission: 'audit.read' },
},
```

`AdminView.vue` is a **tabbed container** — Branches, Departments, Categories, Priorities, Statuses — rather than five routes. One route keeps the sidebar short and the tabs make the relationship between the five obvious.

**File: `frontend-vuejs/src/components/layout/AppSidebar.vue`**

Add to `navItems`, after `roles`:

```ts
{ name: 'admin', titleKey: 'nav.admin', icon: '⚙️', permission: 'admin.manage' },
{ name: 'admin-sla', titleKey: 'nav.sla', icon: '⏱️', permission: 'sla.manage' },
{ name: 'audit', titleKey: 'nav.audit', icon: '📜', permission: 'audit.read' },
```

### 2 — Administration screens

**Create file: `frontend-vuejs/src/views/admin/AdminView.vue`**

A tab bar over five child components, tab state in a local ref. Copy the `BaseCard` + header slot shape from `UsersView.vue`.

**Create file: `frontend-vuejs/src/components/admin/AdminBranches.vue`**

- `GET /admin/branches?includeInactive=true`, table of code, names, active state.
- New / Edit through `BaseDialog`; `code` is an input on create and **read-only text** on edit.
- An activate/deactivate toggle per row, with `BaseDialog` confirmation on deactivate.
- **Create and edit controls render only when `auth.roleCode === 'ADMIN'`.** A Manager holding `admin.manage` sees the list and nothing else. Show a one-line note explaining why, so the absence reads as intentional.
- A 409 on deactivate maps to `admin.errors.branchInUse` naming users or tickets. Read `ApiError.serverMessage` to decide which; if it is ambiguous, use one message covering both rather than guessing.

**Create file: `frontend-vuejs/src/components/admin/AdminDepartments.vue`**

- A branch `<select>` filter; for a non-Administrator, pre-select and **lock** it to their own branch — a Manager cannot administer another branch (Story 20 returns 403).
- Same table, dialog, and toggle shape.
- A 409 on deactivate maps to `admin.errors.departmentInUse`.

**Create files: `AdminCategories.vue` and `AdminPriorities.vue`**

- `GET /admin/reference/{kind}?includeInactive=true`.
- Table of code, names, `sortOrder`, active state. Create, edit, reorder, deactivate.
- Deactivating a **priority** with an active SLA policy returns 409 → `admin.errors.priorityHasSla`, with a link to the SLA screen. That link is what turns a dead end into a next step.

**Create file: `AdminStatuses.vue`**

- The list with **rename and reorder only.**
- **No create button. No deactivate toggle.** Above the table, an inline note: *"Ticket statuses are defined by the workflow and cannot be added or removed."*
- The edit dialog shows `code` as read-only and offers `nameEn`, `nameAr`, `sortOrder`.

### 3 — Customer linking on the Users screen

**File: `frontend-vuejs/src/views/UsersView.vue`**

- Add a **Customer** column showing the linked customer's name, or an em dash.
- Add a **Link customer** row action, rendered only when the row's role code is `CUSTOMER` **and** `auth.can('admin.manage')`.
- The dialog holds a customer search — `GET /customers?q=…`, debounced 300 ms — a result list, and an **Unlink** button when a link already exists.
- `PATCH /users/:id/customer` with `{ customerId }` or `{ customerId: null }`.
- Error mapping: 409 → `users.link.alreadyLinked`; 422 with `details.userId` → `users.link.notCustomerRole`; 422 with `details.customerId` → `users.link.inactiveCustomer`. **Three distinct messages** — Story 20 returns three distinct failures and collapsing them tells the administrator nothing.

### 4 — SLA policy editor

**Create file: `frontend-vuejs/src/views/admin/SlaPoliciesView.vue`**

- `GET /sla/policies` — four rows, one per priority, ordered by `sortOrder`.
- Each row: priority name (via `useLocalizedName`), response target, resolution target, active flag, and an inline **Edit** opening a `BaseDialog`.
- `PUT /sla/policies/:priorityId` with both targets and `isActive`.
- Client-side check mirroring Story 16's `.refine`: resolution ≥ response, with the message on the resolution field. The server's 422 still maps from `details` — the client check is convenience.
- Show targets in **minutes** with a derived human hint (`480 minutes ≈ 8 hours`) through `useFormat`'s number formatter. **Store and send minutes**; the hint is display only.
- A note that targets are wall-clock, not business hours — the same fact Story 16 documented in code, surfaced where a manager will act on it.

### 5 — Audit viewer

**Create file: `frontend-vuejs/src/views/AuditView.vue`**

- `GET /audit` with filters: entity type `<select>`, action `<select>`, actor `<select>` from `GET /users`, and a date range. Paged.
- Table: timestamp (`useFormat`), actor name, action, entity type, summary.
- `details` is shown in an expandable row as **formatted JSON in a `<pre>`**, and `null` renders as an em dash. `{{ }}` interpolation only — the payload is server-authored but there is still no reason to reach for `v-html`.
- A row whose `entityType` is `Ticket` links to `ticket-detail` with its `entityId`. Every other type renders as plain text — Story 15 stores ids for configuration rows that have no detail route.
- Read-only. No action, no delete, no export.

### 6 — Translations

**Files: `frontend-vuejs/src/i18n/locales/en.json` and `ar.json`**

Add `nav.admin`, `nav.sla`, `nav.audit`, and:

```
admin.title
admin.tabs.{branches,departments,categories,priorities,statuses}
admin.columns.{code,nameEn,nameAr,sortOrder,active,branch,actions}
admin.actions.{new,edit,activate,deactivate,confirmDeactivate,save,cancel}
admin.statuses.note
admin.branches.{adminOnlyNote,title}
admin.departments.{lockedBranchNote,title}
admin.errors.{branchInUse,departmentInUse,priorityHasSla,duplicateCode,statusImmutable}
admin.empty.{title,description}

sla.title, sla.wallClockNote
sla.columns.{priority,responseTarget,resolutionTarget,active}
sla.form.{responseTargetMinutes,resolutionTargetMinutes,isActive,save,cancel}
sla.errors.resolutionBelowResponse
sla.minutesHint

audit.title
audit.columns.{timestamp,actor,action,entityType,summary,details}
audit.filter.{allTypes,allActions,allActors,from,to,apply,clear}
audit.action.{TICKET_CREATED,TICKET_STATUS_CHANGED,TICKET_ASSIGNED,TICKET_UNASSIGNED,TICKET_PRIORITY_CHANGED,CONFIG_CREATED,CONFIG_UPDATED,CONFIG_DEACTIVATED,KB_ARTICLE_PUBLISHED,KB_ARTICLE_UNPUBLISHED,SLA_POLICY_UPDATED}
audit.entityType.{Ticket,Branch,Department,TicketCategory,TicketPriority,TicketStatus,KbArticle,KbCategory,SlaPolicy,User}
audit.noDetails, audit.empty.{title,description}

users.link.{action,title,search,current,unlink,none,alreadyLinked,notCustomerRole,inactiveCustomer,success}
```

`audit.action.*` and `audit.entityType.*` are translation keys because those values are **constants from `audit.constants.ts`**, not database rows with bilingual names. An unrecognised value must fall back to the raw code rather than rendering an empty string — Story 19 deliberately typed the audit `action` filter as a free string so a future action stays queryable, and the UI must degrade the same way.

### 7 — Integration and cleanup pass

The work item's task 10 asks for connected modules and removed duplication. Do this **after** every screen above works.

**a. Consolidate `messageFor`.** Grep for it in `frontend-vuejs/src/views/`; there is one copy per view. Extract the shared body into `frontend-vuejs/src/composables/useApiError.ts` returning `messageFor(err, overrides?)`, where `overrides` is a per-view map from status code to translation key. Migrate every view. **Every existing view test must pass unchanged** — that is the check that the consolidation preserved behaviour.

**b. Consolidate reference-data priming.** Grep for `api.get('/tickets/meta')`. Extract `useTicketMeta()` into `frontend-vuejs/src/composables/`, caching within the page lifetime so a screen mounting two components does not fetch twice.

**c. Cross-link the modules.** Each of these is a one-line link that turns two screens into one product:
- Ticket detail → the customer's detail screen (`customer-detail` route) via the ticket's `customerId`.
- Customer detail → that customer's tickets (`/tickets?customerId=…`).
- Audit row for a `Ticket` → that ticket's detail.
- Agent dashboard → already linked by Story 21; confirm it survived.
- Priority-has-SLA error → the SLA screen.
- KB article → back to the Help Centre; the ticket-detail KB panel → the article.

**d. Verify no duplicated business rule.** Confirm the SLA status→colour mapping exists **only** in `SlaBadge.vue`, the note internal-marker only in `TicketNotesList.vue`, and the open/closed status definition only server-side. A second copy of any of these is a defect to remove now.

**e. Confirm every new view has a `requestSeq` guard and a four-way state branch.** Grep and check each one; a missing guard is the bug that will not reproduce on a fast machine.

---

## Edge Cases & Failure Modes

- **A Manager on the Branches tab.** Sees the list, no create or edit controls, and an explanatory note. Without the note the screen reads as broken. The controls are **absent**, not disabled — Story 20 returns 403 and a disabled control still invites a support ticket.
- **A Manager on the Departments tab.** The branch filter is pre-selected and locked to their branch. Leaving it free would let them request another branch and collect a 403 they cannot act on.
- **Deactivating a branch with active users.** 409 → the specific message. If `ApiError.serverMessage` does not clearly distinguish users from tickets, use one message covering both. **Do not guess and name the wrong cause** — a wrong diagnosis is worse than a vague one.
- **Deactivating a priority with an SLA policy.** 409 → a message with a link to the SLA screen.
- **The statuses tab.** No create, no deactivate — absent, with an inline note. A hidden-but-present button that returns 403 is the failure this rule exists to prevent.
- **A duplicate code on create.** 409 → `admin.errors.duplicateCode` on the code field, not in the banner.
- **A department code duplicated across branches.** **Allowed** after Story 20's index change. If the UI rejects it client-side, it contradicts the backend — do not add such a check.
- **Linking a customer already linked to another account.** 409 → `users.link.alreadyLinked`. The generic banner would leave the administrator hunting for the other account.
- **Linking a non-`CUSTOMER` user.** The action is not offered for those rows, but a stale list could still allow it — map the 422 by `details.userId` anyway.
- **Unlinking.** Always offered when a link exists, always permitted by Story 20. It is the recovery path.
- **The linked account's session after an unlink.** Their next portal request returns 403 (Story 18's per-request re-read), and Story 22's unlinked state renders. No re-login and no stale cache. Verify this manually — it crosses three stories and no single test covers it.
- **An audit `action` the UI has no translation for.** Falls back to the raw code. Story 19 typed the filter as a free string precisely so a new action stays usable; a blank cell would hide it.
- **An audit `details` payload that is truncated JSON.** Story 15's service returns `details: null` for unparseable JSON, so the viewer shows an em dash. It never receives a broken string to render.
- **An audit `entityId` pointing at a deleted ticket.** The link resolves to a detail route that 404s. Acceptable — the audit row is the record that it existed. Do not pre-validate every id; that would be one request per row.
- **A large audit page.** `pageSize` is capped server-side at 100. Default to 25.
- **The `messageFor` consolidation changing a message.** Each view's overrides must reproduce its current mapping exactly. If a view test fails, the override map is wrong — **fix the map, not the test.**
- **`useTicketMeta` caching across a locale switch.** Names come from the API in both languages and `useLocalizedName` picks at render time, so a cache is safe. Confirm the payload really carries both `nameEn` and `nameAr` before caching.
- **The SLA minutes hint.** Display only. If it ever becomes an input, a rounding bug silently changes a target — keep the input in minutes.

---

## Test Plan

1. **Component — create `frontend-vuejs/src/views/admin/__tests__/AdminView.spec.ts`.**
   - Renders five tabs; switching tabs mounts the matching child.
   - Absent entirely for a user without `admin.manage` — asserted through the router guard test.
2. **Component — create `frontend-vuejs/src/components/admin/__tests__/AdminBranches.spec.ts`.**
   - An `ADMIN` sees create and edit; a `MANAGER` holding `admin.manage` sees **neither**, plus the note.
   - A 409 on deactivate renders `admin.errors.branchInUse`, not the generic banner.
   - A 409 on create renders `admin.errors.duplicateCode` on the code field.
   - `code` is read-only in the edit dialog.
3. **Component — create `frontend-vuejs/src/components/admin/__tests__/AdminStatuses.spec.ts`.**
   - **No create button and no deactivate toggle exist in the DOM.**
   - The explanatory note renders.
   - Editing sends only `nameEn`, `nameAr`, `sortOrder` — assert the patched body's key set.
4. **Component — create `frontend-vuejs/src/components/admin/__tests__/AdminPriorities.spec.ts`.**
   - A 409 on deactivate renders `admin.errors.priorityHasSla` **with** a link to `admin-sla`.
5. **Component — create `frontend-vuejs/src/components/admin/__tests__/AdminDepartments.spec.ts`.**
   - A `MANAGER`'s branch select is pre-selected and disabled.
   - An `ADMIN`'s is free and defaults to all.
6. **Component — extend `frontend-vuejs/src/views/__tests__/UsersView.spec.ts`** (create if absent).
   - The link action appears only on `CUSTOMER` rows and only with `admin.manage`.
   - 409, 422-`userId`, and 422-`customerId` each render their **own** message.
   - Unlink sends `{ customerId: null }` explicitly, never an empty body.
   - The customer search debounces to one request.
7. **Component — create `frontend-vuejs/src/views/admin/__tests__/SlaPoliciesView.spec.ts`.**
   - Four rows ordered by priority `sortOrder`.
   - Resolution below response is blocked client-side with the message on the resolution field.
   - Saving sends minutes, not hours.
   - A server 422 maps from `details`.
8. **Component — create `frontend-vuejs/src/views/__tests__/AuditView.spec.ts`.**
   - Renders one row per entry, newest first.
   - A `Ticket` row links to `ticket-detail`; a `Branch` row does not link.
   - `details: null` renders an em dash; an object renders as formatted JSON in a `<pre>`.
   - An unknown `action` falls back to its raw code.
   - Applying filters issues exactly one request with all applied parameters.
   - Paging issues one request and preserves the filters.
9. **Unit — create `frontend-vuejs/src/composables/__tests__/useApiError.spec.ts`.**
   - 403 → `errors.forbidden`; status `0` → `errors.unreachable`; an override map wins over the default.
   - An unmapped status falls back to `serverMessage`, then to `errors.unreachable`.
10. **Unit — create `frontend-vuejs/src/composables/__tests__/useTicketMeta.spec.ts`.**
    - Two consumers in one page issue **one** request.
    - A failure surfaces to both consumers rather than leaving one hanging.
11. **Regression — the full frontend suite must pass with no test edited** other than the ones this story adds. Task 7's consolidations are behaviour-preserving by definition; a failing existing test means one was not.
12. **i18n — `locale-parity.spec.ts` passes** with every new key in both files.

---

## End-to-end verification

Run this **after** all tests pass. It is the work item's acceptance scenario and the reason the feature exists. Backend on `npm run dev` in `backend-nodejs/`, frontend on `npm run dev` in `frontend-vuejs/`, database freshly migrated and seeded.

1. **Administrator prepares.** Sign in as `admin@azm.local`.
   - `/admin` → Categories: create **Network** and confirm it appears in the ticket create form's category list.
   - Statuses: rename **In Progress** and confirm the ticket detail reflects it; confirm there is no create or deactivate control.
   - `/admin/sla` → set `URGENT` to 15-minute response, 120-minute resolution.
   - `/users` → link a second `CUSTOMER`-role account to an unlinked customer. Confirm the Customer column updates.
   - `/kb` → publish an article about password resets.
2. **Customer files a request.** Sign in as `customer@azm.local`.
   - Lands on `/portal`, not the dashboard.
   - **New Request** → subject "Cannot sign in", the new **Network** category, priority `URGENT` → confirmation shows a `TKT-…` number.
   - My Tickets shows it as `NEW` with an SLA badge.
   - Help Centre shows the published article and **no** draft.
3. **Agent picks it up.** Sign in as `agent@azm.local`.
   - Dashboard → **Unassigned** tile count includes it; click through to the filtered list.
   - Open it → the SLA card shows a 15-minute response target and a 120-minute resolution target.
   - The Knowledge Base panel, seeded from the subject, finds the password-reset article; open it in a new tab.
   - Assign to self → the status becomes `ASSIGNED` **without** a reload, and the SLA response clock stops.
   - Add an **internal** note, then a **customer-visible** note.
   - Transition to `IN_PROGRESS`, then `RESOLVED`.
4. **Customer sees the outcome.** Back as `customer@azm.local`.
   - The ticket reads `RESOLVED`.
   - The **customer-visible** note is present; the **internal** note is **absent**.
   - The history shows the lifecycle without internal entries.
   - Reply to the ticket; confirm as the agent that the reply is non-internal.
5. **Management reviews.** Sign in as `manager@azm.local`.
   - `/reports` → the ticket appears in `byStatus`, `byCategory` (Network), `byChannel` (WEB), and the agent's workload row.
   - Resolution stats include it.
   - `/audit` → the full trail: `TICKET_CREATED`, `TICKET_ASSIGNED`, `TICKET_STATUS_CHANGED` ×3, `CONFIG_CREATED` for the category, `SLA_POLICY_UPDATED`, `KB_ARTICLE_PUBLISHED`.
   - Click the ticket audit row → the ticket detail opens.
6. **Isolation.** As `customer@azm.local`, open the **other** customer's ticket id by URL → not-found. Navigate to `/tickets` → redirected to `/portal`.
7. **Unlinked recovery.** As the administrator, unlink the demo customer account. As that customer, reload `/portal` → the **unlinked** state, not an empty list. Re-link and confirm recovery **without** a re-login.
8. **Bilingual.** Repeat steps 2–5 in Arabic. Every screen mirrors, every label is Arabic, ticket numbers and dates stay legible.
9. **Regression on US01–US04.** Sign in as each seeded role; walk users, roles, customers, and the staff ticket lifecycle. **Nothing from the earlier work items may have regressed** — that is a Definition-of-Done item on the work item itself.

---

## Verification Steps

1. **Frontend typechecks:** `npm run type-check` in `frontend-vuejs/`.
2. **Frontend tests:** `npm run test` in `frontend-vuejs/`.
3. **Lint:** `npm run lint` in `frontend-vuejs/`.
4. **Backend regression:** `npm run test:all` in `backend-nodejs/` — this story changes no backend code, so **every backend test must pass unchanged**.
5. **No raw HTML:** `grep -rn "v-html" frontend-vuejs/src/` returns nothing.
6. **Duplication check:** grep for `messageFor` — it is defined **once**, in `useApiError.ts`. Grep for `api.get('/tickets/meta')` — it appears once, in `useTicketMeta.ts`.
7. **Guard check:** every view under `frontend-vuejs/src/views/` that fetches a list has a `requestSeq` counter.
8. **Frontend runs:** the full end-to-end scenario above, all nine steps.
9. **Build:** `npm run build` in `frontend-vuejs/` and `npm run build` in `backend-nodejs/` both succeed.

---

## Done Criteria

- [ ] `/admin` exists with five tabs, gated on `admin.manage`.
- [ ] Branch create and edit render only for the Administrator **role**; a Manager sees the list plus an explanatory note.
- [ ] The Departments tab locks a Manager to their own branch.
- [ ] The Statuses tab has **no** create button and **no** deactivate toggle in the DOM, plus an inline explanation.
- [ ] `code` is read-only in every edit form.
- [ ] Each Story 20 refusal — branch in use, department in use, priority has SLA, duplicate code — has its own message, and the SLA one links to the SLA screen.
- [ ] A department code duplicated across branches is accepted by the UI.
- [ ] `/admin/sla` lists four policies and edits them in minutes, with a wall-clock note and a resolution-≥-response check.
- [ ] The Users screen shows a Customer column and offers linking only on `CUSTOMER` rows with `admin.manage`.
- [ ] Linking maps 409, 422-`userId`, and 422-`customerId` to **three distinct** messages.
- [ ] Unlink sends an explicit `{ customerId: null }`.
- [ ] `/audit` renders filterable, paged, read-only entries; `Ticket` rows link to the ticket and others do not.
- [ ] An unknown audit action falls back to its raw code; a null `details` renders an em dash.
- [ ] `messageFor` is defined once, in `useApiError.ts`, and every view uses it.
- [ ] `/tickets/meta` is fetched through one `useTicketMeta` composable.
- [ ] The SLA colour map, the internal-note marker, and the open/closed definition each exist in exactly one place.
- [ ] Every new list view is `requestSeq`-guarded with a four-way state branch.
- [ ] The six cross-links in task 7c all work.
- [ ] `en.json` and `ar.json` have identical key sets and no empty Arabic value.
- [ ] The full nine-step end-to-end scenario passes in both languages.
- [ ] US01–US04 functionality is confirmed unregressed.
- [ ] Every frontend and backend test passes, and both projects build.

**This is the final story for work item 27. Report completion to the user.**
