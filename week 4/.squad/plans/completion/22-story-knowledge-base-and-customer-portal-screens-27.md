# Story 22 — Knowledge Base & Customer Portal Screens (Story: 27)

## Prerequisites

- **Story 17 completed** ([17-story-knowledge-base-backend-27.md](17-story-knowledge-base-backend-27.md)) — `GET /api/v1/kb/articles`, `/articles/:id`, `/articles/slug/:slug`, `/categories`, and the publish routes exist; the published-only guard lives in the service, so an unprivileged caller physically cannot receive a draft.
- **Story 18 completed** ([18-story-customer-self-service-backend-27.md](18-story-customer-self-service-backend-27.md)) — every `/api/v1/portal/*` route exists, ownership is enforced server-side, and an unlinked account gets **403**, not an empty list.
- **Story 21 completed** ([21-story-agent-workspace-and-management-dashboard-27.md](21-story-agent-workspace-and-management-dashboard-27.md)) — `DashboardView.vue` is now a real agent workspace, `SlaBadge.vue` exists, and the `nav.reports` precedent for a permission-gated sidebar entry is established.

**This story is frontend-only.**

---

## Story Goal

Put the Knowledge Base and the customer portal in front of their two very different audiences:

1. **A Knowledge Base browser** — search, category filter, and an article reader, visible to anyone holding `kb.read`, which after Story 15 is every role including `CUSTOMER`.
2. **Article authoring** — create, edit, publish, unpublish, delete, shown only with `kb.manage`.
3. **A KB side panel on the ticket detail screen** so an agent can find an article without leaving the ticket.
4. **A customer portal** — the customer's own ticket list, a ticket detail with notes and history, and a reply box.
5. **A support web form** that files a ticket through `POST /portal/tickets`.
6. **Role-aware landing** — a `CUSTOMER` account lands in the portal, not on the agent dashboard.

**Not in scope:**
- Any backend change.
- A rich-text editor. Bodies are plain `<textarea>` and render as pre-wrapped text.
- Attachment **upload** from the portal — Story 18 deliberately made it read-only. Download is in scope.
- Article ratings, comments, or "related articles".
- Administration screens or the audit log viewer → Story 23.
- Public, unauthenticated access to anything. The portal is behind the existing login.

---

## Context — Read These Files First

1. `frontend-vuejs/src/views/CustomersView.vue` — the **whole file** (501 lines). The list-screen template both the KB browser and the portal ticket list copy: the `BaseCard` + `#header` slot with a permission-gated action, the filter row, the four-way loading / error / empty / no-results branch, `messageFor()` (~lines 258–266), `requestSeq` (~lines 251, 268, 279, 283, 286), and the 300 ms debounce that also resets the page (~line 293).
2. `frontend-vuejs/src/views/CustomerDetailView.vue` — the **whole file** (791 lines). The detail-screen template: a profile card with an edit toggle, child-resource cards, an attachment table with download, and timeline rendering. The portal ticket detail is this shape with fewer actions.
3. `frontend-vuejs/src/views/TicketDetailView.vue` — the **whole file** (1429 lines). Read the notes card and the history timeline specifically (~lines 781–835 hold their fetches). **The portal detail is a strict subset of this screen** — same data, no lifecycle controls. Extracting shared child components is task 6.
4. `frontend-vuejs/src/router/index.ts` — the routes array (~lines 15–82) and the guard (~lines 89–106). Note three behaviours this story depends on: `public: true` bypasses the session check (~line 92), an authenticated user hitting `/login` is redirected to `dashboard` (~lines 97–99), and a permission failure redirects to `dashboard` (~lines 101–103). **Task 2 adds a fourth rule to this same function.**
5. `frontend-vuejs/src/components/layout/AppSidebar.vue` — `navItems` (~lines 45–52) and the `visibleNavItems` permission filter (~lines 54–56). A `CUSTOMER` holds only `tickets.read` and `kb.read`, so today they would see Dashboard, Tickets, and About — **the staff Tickets screen, which is wrong for them.** Task 3 fixes that.
6. `frontend-vuejs/src/components/layout/AppTopbar.vue` — the account block (~lines 16–20) and `roleLabel` (~lines 49–51). The portal reuses the same layout chrome; there is no second shell.
7. `frontend-vuejs/src/stores/auth.store.ts` — `can()` (~lines 49–51), `roleCode` (~line 47), `user` (~line 39), and `restore()` (~lines 88–105). `roleCode` is what drives the portal landing decision.
8. `frontend-vuejs/src/api/client.ts` — `api.get/post` (~lines 165–177) and **`api.download(endpoint)`** (~line 176), which the portal attachment list uses unchanged. Note the 401 handler (~lines 110–115) clears the session — a portal 403 must not be confused with it.
9. `frontend-vuejs/src/views/__tests__/CustomersView.spec.ts` — the **whole file**. The test harness: `vi.mock('@/api/client')`, the `vue-router` mock, the `stubs` list, and `vi.useFakeTimers()` for the debounce tests.
10. `frontend-vuejs/src/components/ui/BaseDialog.vue` — the modal used by `CustomersView.vue` and `UsersView.vue` for their create forms. The article editor and the support form both use it.
11. `frontend-vuejs/src/composables/useLocalizedName.ts` and `useFormat.ts` — both export a single function. Every bilingual name and every date goes through them.
12. `frontend-vuejs/src/i18n/locales/en.json` / `ar.json` — 401 lines each. `nav` at ~lines 18–26; `tickets` at ~line 274.
13. `frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts` — identical key sets, and no empty Arabic value.

Grep targets:
- Grep for `auth.can(` in `frontend-vuejs/src/` to see every existing permission gate before adding new ones.
- Grep for `api.download(` in `frontend-vuejs/src/views/` to copy the existing attachment-download call rather than rebuilding it.
- Grep for `v-html` in `frontend-vuejs/src/` — **there must be zero hits before and after this story.** Article bodies are user-authored text.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Article bodies** | Rendered as **text** in a `white-space: pre-wrap` block. **Never `v-html`.** A body is author-supplied and this project has no sanitiser. |
| **Draft visibility** | The client never decides. Story 17's service already withholds drafts; the UI shows the "include drafts" toggle only with `kb.manage`, and the backend re-checks. |
| **A missing article** | The backend returns 404 for a draft an unprivileged caller requested. The reader shows a not-found state, **not** "you lack permission" — mirroring the server's deliberate non-disclosure. |
| **Portal landing** | A `CUSTOMER`-role account landing on `/` is redirected to `/portal`. Enforced in the router guard, so a bookmarked `/` also lands correctly. |
| **Portal sidebar** | A `CUSTOMER` sees My Tickets, New Request, Help Centre, and About — and **not** the staff Tickets, Customers, Users, Roles, Reports, or Dashboard entries. |
| **Unlinked account** | A 403 from a portal route renders a distinct, actionable state ("this account is not linked to a customer record — contact support"), **not** the generic error banner and **not** an empty list. |
| **No lifecycle controls** | The portal detail renders no status, assignee, priority, or edit control. They are **absent from the template**, not hidden by CSS. |
| **Reply** | One textarea posting to `POST /portal/tickets/:id/notes`. There is no internal-note toggle anywhere in the portal. |
| **Search** | 300 ms debounce, resets to page 1, `requestSeq`-guarded — the same three behaviours `CustomersView.vue` already implements. |
| **Bilingual** | Articles carry both languages; the reader shows the one matching the locale and offers a switch to the other. Every chrome string goes through `t()`. |

---

## Frontend Tasks

### 1 — Routes

**File: `frontend-vuejs/src/router/index.ts`**

Add inside the `AppLayout` children array, after the reports route from Story 21:

```ts
{
  path: 'kb',
  name: 'kb',
  component: () => import('@/views/KnowledgeBaseView.vue'),
  meta: { titleKey: 'nav.kb', permission: 'kb.read' },
},
{
  path: 'kb/:id',
  name: 'kb-article',
  component: () => import('@/views/KbArticleView.vue'),
  meta: { titleKey: 'nav.kb', permission: 'kb.read' },
},
{
  path: 'portal',
  name: 'portal-tickets',
  component: () => import('@/views/portal/PortalTicketsView.vue'),
  meta: { titleKey: 'nav.myTickets', permission: 'tickets.read' },
},
{
  path: 'portal/new',
  name: 'portal-new-ticket',
  component: () => import('@/views/portal/PortalNewTicketView.vue'),
  meta: { titleKey: 'nav.newRequest', permission: 'tickets.create' },
},
{
  path: 'portal/tickets/:id',
  name: 'portal-ticket-detail',
  component: () => import('@/views/portal/PortalTicketDetailView.vue'),
  meta: { titleKey: 'nav.myTickets', permission: 'tickets.read' },
},
```

The portal routes are gated on `tickets.read` / `tickets.create` because those are the permissions a `CUSTOMER` actually holds after Story 15. **Ownership is not a client concern** — Story 18 enforces it server-side, and the router must not try to duplicate it.

### 2 — Role-aware landing

**File: `frontend-vuejs/src/router/index.ts`**

Add to `router.beforeEach` (~lines 89–106), **after** the authentication check (~lines 92–95) and **before** the permission check (~lines 101–103):

```ts
// A customer has no use for the agent workspace. Redirect at the router so a
// bookmarked "/" lands in the portal too, not only a fresh sign-in.
if (auth.roleCode === 'CUSTOMER' && to.name === 'dashboard') {
  return { name: 'portal-tickets' }
}
```

Order matters. Placing it before the auth check would redirect a signed-out user; placing it after the permission check would let the permission failure's own `dashboard` redirect fire first and loop.

**Check for a redirect loop explicitly:** the permission guard redirects to `dashboard` (~line 103), and this rule redirects `dashboard` to `portal-tickets`. If `portal-tickets` ever failed its own permission check the two would ping-pong. It cannot today — a `CUSTOMER` holds `tickets.read` — but assert it in a router test so a future permission change fails loudly instead of hanging the browser.

### 3 — Sidebar

**File: `frontend-vuejs/src/components/layout/AppSidebar.vue`**

The current `navItems` array (~lines 45–52) filters on permission alone, which is not sufficient: a `CUSTOMER` holds `tickets.read` and would therefore see the **staff** Tickets screen. Add a `roles?: string[]` field to `NavItem` (~lines 31–37) and extend `visibleNavItems` (~lines 54–56):

```ts
const visibleNavItems = computed(() =>
  navItems.filter(item =>
    (!item.permission || auth.can(item.permission)) &&
    (!item.roles || item.roles.includes(auth.roleCode)) &&
    (!item.excludeRoles || !item.excludeRoles.includes(auth.roleCode)),
  ),
)
```

Then:

```ts
const navItems: NavItem[] = [
  { name: 'dashboard', titleKey: 'nav.dashboard', icon: '📊', excludeRoles: ['CUSTOMER'] },
  { name: 'portal-tickets', titleKey: 'nav.myTickets', icon: '🎟️', roles: ['CUSTOMER'] },
  { name: 'portal-new-ticket', titleKey: 'nav.newRequest', icon: '✉️', roles: ['CUSTOMER'] },
  { name: 'users', titleKey: 'nav.users', icon: '👥', permission: 'users.read' },
  { name: 'customers', titleKey: 'nav.customers', icon: '🧾', permission: 'customers.read' },
  { name: 'tickets', titleKey: 'nav.tickets', icon: '🎫', permission: 'tickets.read', excludeRoles: ['CUSTOMER'] },
  { name: 'reports', titleKey: 'nav.reports', icon: '📈', permission: 'reports.read' },
  { name: 'kb', titleKey: 'nav.kb', icon: '📚', permission: 'kb.read' },
  { name: 'roles', titleKey: 'nav.roles', icon: '🔑', permission: 'roles.read' },
  { name: 'about', titleKey: 'nav.about', icon: 'ℹ️' },
]
```

`roles` and `excludeRoles` are **display** concerns only. Every real gate is a permission on the route and a check on the server; nothing here grants access.

### 4 — Knowledge Base browser

**Create file: `frontend-vuejs/src/views/KnowledgeBaseView.vue`**

Copy `CustomersView.vue` structure. Elements:
- Header slot with a **New article** button, rendered only with `auth.can('kb.manage')`.
- A search input with the 300 ms debounce, a category `<select>` populated from `GET /kb/categories`, and — only with `kb.manage` — an **Include drafts** checkbox.
- Result cards: localized title, category badge, excerpt, a **Draft** badge when `isPublished` is false, and the updated date through `useFormat`. Each card is a `RouterLink` to `kb-article`.
- Pagination and the four-way state branch, matching `CustomersView.vue` (~lines 31–47). Two distinct empty states — "no articles exist" and "nothing matched your search".
- `onMounted`: `Promise.all` over `/kb/categories` and the first `/kb/articles` page, matching `TicketsView.vue` (~lines 542–552).

**Create file: `frontend-vuejs/src/views/KbArticleView.vue`**

- Fetches `GET /kb/articles/:id`.
- Renders the title and body for the current locale, with a toggle to view the other language. The body sits in a `<div class="article-body">` styled `white-space: pre-wrap`. **`{{ body }}` interpolation only — no `v-html`.**
- A **Back to Help Centre** link.
- With `kb.manage`: Edit, Publish / Unpublish, and Delete. Delete goes through `BaseDialog` for confirmation, matching the pattern `CustomersView.vue` uses.
- A 404 renders a not-found state with a link back — **not** a permission message.

**Create file: `frontend-vuejs/src/components/kb/KbArticleForm.vue`**

A `BaseDialog` form with `titleEn`, `titleAr`, `bodyEn`, `bodyAr`, category `<select>`, and `sortOrder`. Used for both create and edit. **No `isPublished` field** — Story 17 rejects it on `PATCH`, and offering it would build a control that silently does nothing. Publishing is a separate button.

Validation errors from a 422 map field-by-field from `ApiError.details` (`types/api.ts` ~lines 11–25 shows the shape).

### 5 — KB panel on the ticket detail screen

**File: `frontend-vuejs/src/views/TicketDetailView.vue`**

Add a collapsible **Knowledge Base** card after the SLA card from Story 21, rendered only with `auth.can('kb.read')`:
- A search input, debounced, calling `GET /kb/articles?q=…&pageSize=5`.
- Results as links opening `kb-article` in a new tab, so the agent does not lose the ticket.
- On first expand, seed the search with the ticket's **subject** as a starting point. Do it once; re-expanding must not clobber a term the agent typed.

Guard this fetch with its own `requestSeq`, separate from the view's other counters — sharing one across independent fetches makes each cancel the others.

### 6 — Extract the shared ticket children

`TicketDetailView.vue` is 1429 lines and the portal detail needs its notes list, attachment table, and history timeline **without** the lifecycle controls. Copying them would produce a second implementation of the internal-note marker and the timeline merge rendering — precisely the duplication the work item's task 10 says to remove.

**Create files:**
- `frontend-vuejs/src/components/tickets/TicketNotesList.vue` — props `notes`, `loading`, `error`, `canAddNote`, `allowInternalToggle`. The portal passes `allowInternalToggle: false`, which removes the checkbox **from the template**, not from view.
- `frontend-vuejs/src/components/tickets/TicketAttachmentsList.vue` — props `attachments`, `loading`, `error`, `canUpload`, plus a `downloadEndpoint` prop so staff and portal can pass their different URLs. The portal passes `canUpload: false`.
- `frontend-vuejs/src/components/tickets/TicketHistoryTimeline.vue` — props `entries`, `loading`, `error`, `hasMore`; emits `loadMore`.

Then **refactor `TicketDetailView.vue` to use all three.** Its existing tests must pass **unchanged** — that is the check that the extraction preserved behaviour, exactly as Story 13 used the customer suite to validate the uploader refactor.

### 7 — Customer portal screens

**Create file: `frontend-vuejs/src/views/portal/PortalTicketsView.vue`**

- `GET /portal/tickets` with search, status filter, sort, and pagination, `requestSeq`-guarded and debounced.
- Table: ticket number, subject, status badge, `SlaBadge` (Story 21), created and updated dates. **No assignee column** — a customer has no use for the internal owner.
- A **New request** button linking to `portal-new-ticket`.
- **A 403 renders a dedicated `unlinkedAccount` state**, distinct from the error banner:
  ```ts
  const unlinked = ref(false)
  // ... in the catch:
  if (err instanceof ApiError && err.status === 403) { unlinked.value = true }
  else { loadError.value = messageFor(err) }
  ```
  Do **not** route it through `messageFor()` — a generic "insufficient permissions" tells the customer nothing they can act on.

**Create file: `frontend-vuejs/src/views/portal/PortalNewTicketView.vue`**

The support web form:
- Fields: subject, description, category `<select>` from `GET /portal/meta`, and priority as a `<select>` of the four **codes** with localized labels.
- Client-side validation mirroring `portalCreateTicketSchema` (subject 1–300, description 1–4000). Server-side 422s still map field-by-field from `ApiError.details` — **the client check is convenience, the server is the authority.**
- On success: a clear confirmation showing the assigned ticket number, then navigate to the new ticket's detail.
- On failure: an inline error naming the field. A 409 (no active department, from Story 18) gets its own message telling the customer to contact support — it is a configuration problem, not their input.
- The form sends **only** subject, description, categoryId, and priorityCode. No customer, branch, department, or channel field exists on the form.

**Create file: `frontend-vuejs/src/views/portal/PortalTicketDetailView.vue`**

- `GET /portal/tickets/:id` plus notes, attachments, and history in parallel.
- Renders the ticket summary, the `SlaBadge`, and the three extracted child components with `canAddNote: true`, `allowInternalToggle: false`, `canUpload: false`.
- A reply box posting to `POST /portal/tickets/:id/notes`, then refetching notes and history.
- **A 404 renders a not-found state**, matching the server's deliberate non-disclosure. Never "you do not own this ticket".
- A link to the Help Centre.

### 8 — Translations

**Files: `frontend-vuejs/src/i18n/locales/en.json` and `ar.json`**

Add `nav.kb` (`"Help Centre"` / `"مركز المساعدة"`), `nav.myTickets` (`"My Tickets"` / `"تذاكري"`), `nav.newRequest` (`"New Request"` / `"طلب جديد"`), and two namespaces:

```
kb.title, search, allCategories, includeDrafts, newArticle, draft, published
kb.article.{back,edit,publish,unpublish,delete,confirmDelete,viewIn,updated,notFound,notFoundHint}
kb.form.{titleEn,titleAr,bodyEn,bodyAr,category,noCategory,sortOrder,save,cancel}
kb.empty.{title,description}
kb.noResults.{title,description}
kb.panel.{title,search,openArticle,noResults}

portal.title, newRequest, backToList
portal.columns.{number,subject,status,sla,created,updated}
portal.empty.{title,description}
portal.noResults.{title,description}
portal.unlinked.{title,description}
portal.detail.{title,description,notFound,notFoundHint,helpCentre}
portal.reply.{title,placeholder,submit,success}
portal.form.{subject,description,category,priority,submit,successTitle,successBody,configError}
portal.priority.{LOW,MEDIUM,HIGH,URGENT}
```

`portal.priority.*` **is** a translation key set, unlike statuses and categories, because Story 18's form sends priority **codes** rather than ids and the API's `/portal/meta` bilingual names are the fallback — use the API names when present and these keys otherwise. Article and category names always come from the API through `useLocalizedName`.

---

## Edge Cases & Failure Modes

- **An unlinked customer account.** Every portal screen renders the `portal.unlinked` state. This is the story's most important error path: the generic banner or an empty list would leave the customer with no idea that an administrator must link their account.
- **A 403 confused with a 401.** `api/client.ts` clears the session on 401 (~lines 110–115) but not on 403. The portal must catch 403 **specifically** by `err.status`, not by string-matching a message.
- **A customer opening another customer's ticket by URL.** The API returns 404 (Story 18). The screen shows not-found. Showing "you do not own this ticket" would confirm the ticket exists.
- **A customer viewing a draft article by URL.** Same shape — 404, not-found state.
- **`v-html` on an article body.** Would execute author-supplied markup. This project has no sanitiser and adds none here. **Grep for `v-html` before and after; zero hits both times.**
- **A body with only newlines or long unbroken strings.** `pre-wrap` plus `overflow-wrap: anywhere` keeps the layout intact; without the second property a long URL overflows the card horizontally.
- **A `CUSTOMER` reaching `/tickets` (the staff list) by URL.** The route is gated on `tickets.read`, which they hold, so the guard lets them through — and the API scopes results by branch, not by customer, so they could see other customers' tickets. **The `excludeRoles` sidebar entry hides the link but does not close the hole.** Add a route-level guard for the staff ticket routes:
  ```ts
  if (auth.roleCode === 'CUSTOMER' && (to.name === 'tickets' || to.name === 'ticket-detail')) {
    return { name: 'portal-tickets' }
  }
  ```
  **This is a real gap, and it is closed here.** Note in the code comment that the durable fix is a distinct backend permission for the staff list, and that it is deliberately not attempted in this frontend-only story. Cover it with a router test.
- **The redirect loop.** `dashboard` → `portal-tickets` and a permission failure → `dashboard`. Safe today; asserted by a test so a future permission change fails loudly.
- **A customer with no tickets.** The empty state, not the unlinked state. The two must be visually and textually distinct — one is normal, the other is broken.
- **The KB panel clobbering a typed search.** Seed from the ticket subject **once**, on first expand. Re-expanding keeps the agent's term.
- **The KB panel's fetch racing the ticket's.** Separate `requestSeq` counters. Sharing one makes each fetch cancel the other and both screens flicker.
- **Extracting the three child components.** The risk is a behaviour change in `TicketDetailView.vue`. Its existing tests must pass **unchanged**; if one needs editing, the extraction changed behaviour and must be redone.
- **The internal-note toggle in the portal.** Absent from the template via `allowInternalToggle: false`, not hidden with CSS. A hidden-but-present control can still be submitted by a crafted form; the backend forces `isInternal: false` regardless (Story 18), but the UI must not offer it at all.
- **A very long article list in Arabic.** Card layout uses logical properties (`margin-inline`, `padding-inline`) so it mirrors. Verify by switching locale, not by reasoning.
- **The support form's 409.** Thrown when the branch has no active department (Story 18). Give it its own message; the generic error reads as the customer's fault.
- **Double-submitting the support form.** Disable the submit button while the request is in flight. Two clicks would file two tickets, and the customer has no way to close one.

---

## Test Plan

1. **Unit — create `frontend-vuejs/src/router/__tests__/guards.spec.ts`.**
   - A `CUSTOMER` navigating to `dashboard` is redirected to `portal-tickets`.
   - A `CUSTOMER` navigating to `tickets` or `ticket-detail` is redirected to `portal-tickets`.
   - A non-customer navigating to `dashboard` is **not** redirected.
   - A signed-out user hitting `dashboard` goes to `login`, not to the portal.
   - Navigating to `portal-tickets` as a `CUSTOMER` resolves in **one** step — the loop assertion.
2. **Unit — create `frontend-vuejs/src/components/layout/__tests__/AppSidebar.spec.ts`.**
   - A `CUSTOMER` sees My Tickets, New Request, Help Centre, About — and **not** Tickets, Dashboard, Customers, Users, Roles, or Reports.
   - An `AGENT` sees Dashboard, Tickets, Customers, Help Centre, About — and not My Tickets or Reports.
   - An `ADMIN` sees every entry.
3. **Component — create `frontend-vuejs/src/views/__tests__/KnowledgeBaseView.spec.ts`.** Copy the harness from `CustomersView.spec.ts`.
   - Renders one card per article; a draft carries a Draft badge.
   - **New article** and **Include drafts** are absent without `kb.manage` and present with it.
   - Typing in search issues exactly **one** request after the 300 ms debounce and resets `page` to 1.
   - A category change issues one request.
   - Two distinct empty states for "no articles" and "no results".
   - A slow first response does not overwrite a fast second.
4. **Component — create `frontend-vuejs/src/views/__tests__/KbArticleView.spec.ts`.**
   - The body renders as **text**; a body containing `<script>alert(1)</script>` appears literally in the DOM and creates no element. **The XSS assertion.**
   - Publish, Unpublish, Edit, and Delete are absent without `kb.manage`.
   - Publish issues `POST /kb/articles/:id/publish` and refetches.
   - A 404 renders the not-found state, not a permission message.
   - The language toggle switches the rendered title and body.
5. **Component — create `frontend-vuejs/src/views/portal/__tests__/PortalTicketsView.spec.ts`.**
   - Renders one row per ticket with an `SlaBadge`, and **no assignee column**.
   - A 403 renders the `portal.unlinked` state and **not** the generic error banner.
   - A 500 renders the error banner and **not** the unlinked state.
   - An empty list renders the empty state, distinct from the unlinked state.
   - Search debounces and resets the page.
6. **Component — create `frontend-vuejs/src/views/portal/__tests__/PortalNewTicketView.spec.ts`.**
   - Submitting sends **exactly** `subject`, `description`, `categoryId`, `priorityCode` — assert the posted body's key set.
   - A 422 maps `details.subject` to the subject field.
   - A 409 renders the configuration-error message.
   - The submit button is disabled while in flight; two rapid clicks issue **one** request.
   - Success shows the ticket number and navigates to the detail route.
7. **Component — create `frontend-vuejs/src/views/portal/__tests__/PortalTicketDetailView.spec.ts`.**
   - No status, assignee, priority, or edit control exists in the DOM.
   - The note form has **no** internal-notes checkbox.
   - Replying issues `POST /portal/tickets/:id/notes` and refetches notes and history.
   - A 404 renders the not-found state.
   - The attachment list renders download links and **no** upload control.
8. **Component — create specs for the three extracted components** (`TicketNotesList`, `TicketAttachmentsList`, `TicketHistoryTimeline`) covering their prop-driven variations, especially `allowInternalToggle: false` removing the checkbox from the DOM.
9. **Regression — `frontend-vuejs/src/views/__tests__/TicketDetailView.spec.ts` must pass unchanged** after the task 6 extraction. That is the acceptance test for the refactor.
10. **i18n — `locale-parity.spec.ts` runs unchanged** and must pass with all new keys in both files.

---

## Verification Steps

1. **Frontend typechecks:** `npm run type-check` in `frontend-vuejs/`.
2. **Frontend tests:** `npm run test` in `frontend-vuejs/`.
3. **Lint:** `npm run lint` in `frontend-vuejs/`.
4. **No raw HTML:** `grep -rn "v-html" frontend-vuejs/src/` returns **nothing**.
5. **Frontend runs** with the backend up. As `customer@azm.local`:
   - Signing in lands on `/portal`, **not** the dashboard.
   - The sidebar shows My Tickets, New Request, Help Centre, About — and no staff entries.
   - Navigating to `/tickets` by URL redirects to `/portal`.
   - My Tickets lists only that customer's tickets, each with an SLA badge.
   - New Request files a ticket; the confirmation shows a `TKT-…` number; the detail opens.
   - The detail shows notes and history with **no** internal notes and no lifecycle controls.
   - Replying adds a note visible to staff as non-internal.
   - Opening another customer's ticket id by URL shows not-found.
   - Help Centre lists published articles only; no Draft badge and no New article button.
6. **As `agent@azm.local`:** the Help Centre shows published articles and no authoring controls; the ticket detail's KB panel searches and opens articles in a new tab.
7. **As `admin@azm.local`:** Include drafts reveals the seeded draft; create, edit, publish, unpublish, and delete an article end to end.
8. **Unlinked check:** using Story 20's link API, clear `customerId` on the demo customer account, reload the portal, and confirm the **unlinked** state — not an empty list, not a generic error. Re-link afterwards.
9. **Bilingual and RTL:** switch to Arabic on every new screen. Layout mirrors, article bodies read correctly, ticket numbers stay legible.
10. **Regression:** re-walk Story 14's staff ticket flow and Story 21's dashboard flow.

---

## Done Criteria

- [ ] `/kb` and `/kb/:id` exist, gated on `kb.read`, with **Help Centre** in the sidebar for every role that holds it.
- [ ] Article bodies render as text; **there is no `v-html` anywhere in the frontend**, asserted by a test and a grep.
- [ ] Authoring controls appear only with `kb.manage`, and the article form has no `isPublished` field.
- [ ] A draft requested by an unprivileged caller renders not-found, never a permission message.
- [ ] The KB panel on the ticket detail searches with its **own** `requestSeq` and seeds from the subject only once.
- [ ] Notes, attachments, and history are **extracted** into three shared components, used by both the staff and portal detail screens.
- [ ] `TicketDetailView.spec.ts` passes **unchanged** after the extraction.
- [ ] A `CUSTOMER` signing in lands on `/portal`.
- [ ] A `CUSTOMER` navigating to `/tickets` or `/tickets/:id` is redirected to the portal.
- [ ] The sidebar is role-aware; a `CUSTOMER` sees no staff entry.
- [ ] A router test proves there is no redirect loop.
- [ ] A portal 403 renders a distinct, actionable unlinked state — not the error banner, not an empty list.
- [ ] A portal 404 renders not-found, never an ownership message.
- [ ] The portal detail template contains no status, assignee, priority, edit, or upload control.
- [ ] The portal note form has no internal toggle in the DOM.
- [ ] The support form posts exactly four fields and cannot be double-submitted.
- [ ] A 409 from the form renders its own configuration message.
- [ ] `en.json` and `ar.json` have identical key sets and no empty Arabic value.
- [ ] All new and existing frontend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 23.**
