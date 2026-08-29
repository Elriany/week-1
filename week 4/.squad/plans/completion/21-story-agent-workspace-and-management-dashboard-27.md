# Story 21 — Agent Workspace & Management Dashboard Screens (Story: 27)

## Prerequisites

- **Story 19 completed** ([19-story-dashboard-and-reporting-apis-27.md](19-story-dashboard-and-reporting-apis-27.md)) — `GET /api/v1/dashboard/agent` and `GET /api/v1/reports/overview` exist, every bucket carries a `filter` object that is valid against `listTicketsQuerySchema`, and `reports.read` gates the management report.
- **Story 16 completed** ([16-story-sla-configuration-and-status-27.md](16-story-sla-configuration-and-status-27.md)) — every ticket payload carries an `sla` object with a `status` of `ON_TRACK` / `AT_RISK` / `BREACHED` / `MET`, or `null`.
- **Story 14 completed** ([../ticket/14-story-ticket-screens-and-lifecycle-actions-18.md](../ticket/14-story-ticket-screens-and-lifecycle-actions-18.md)) — `TicketsView.vue` (928 lines) and `TicketDetailView.vue` (1429 lines) exist, along with the `requestSeq` guard and `messageFor()` idioms this story copies.

**This story is frontend-only.** If a backend gap appears, stop and fix it in the story that owns it rather than working around it here.

---

## Story Goal

Replace the placeholder dashboard with a real agent workspace, and add a management view beside it:

1. **Replace `DashboardView.vue`** — its four cards are static demo content with hardcoded numbers (`12`, `5`). Everything in it goes.
2. **An agent workspace** — My Open, My Breached, Unassigned, and Branch Open tiles; My tickets by status and by priority; an SLA breakdown. Every tile navigates to the ticket list already filtered.
3. **SLA badges on the existing ticket screens** — a status pill in `TicketsView.vue` and an SLA panel in `TicketDetailView.vue`.
4. **An SLA filter** on the ticket list, wired to the `slaStatus` query parameter Story 16 added.
5. **A management dashboard** at `/reports`, gated on `reports.read`, with a date-range filter and the count breakdowns, agent workload, resolution stats, and SLA indicators.
6. **Bilingual and RTL-safe** — every new string in both locale files.

**Not in scope:**
- Charting libraries. **Render breakdowns as tables and CSS bar rows.** The project has no chart dependency and this story does not add one.
- Any backend change.
- Knowledge Base, portal, or administration screens → Stories 22 and 23.
- Real-time updates, polling, or websockets. Screens fetch on mount and on an explicit refresh.
- Export, print, or saved views.

---

## Context — Read These Files First

1. `frontend-vuejs/src/views/DashboardView.vue` — the **whole file** (127 lines). Read it to know exactly what is being deleted: four `BaseCard`s of static content, the hardcoded `12` and `5` (~lines 22–28), and the `features` array (~lines 51–56). The `section.*`, `content.*`, `feature.*`, `step.*`, and `status.*` translation keys it consumes are used **only here** — task 2 covers what happens to them.
2. `frontend-vuejs/src/views/TicketsView.vue` — the **whole file** (928 lines). The list-screen template this story extends. Study specifically:
   - `requestSeq` (~lines 372, 416, 433, 441, 444) — the stale-response guard. **Every fetch in the new views uses it.**
   - `messageFor()` (~lines 406–414) — error-code to translation mapping.
   - the `onMounted` reference-data prime (~lines 542–552) — `Promise.all` over `/tickets/meta` and `/tickets/assignable-users`.
   - the filter row and how a change resets `page` to 1.
   - `useRoute().query` consumption — the new dashboard tiles navigate by pushing a query string, so the list must already read one. **Confirm it does** before building the links; if it does not, wiring `route.query` into the initial filter state is part of task 4.
3. `frontend-vuejs/src/views/CustomersView.vue` — the **whole file** (501 lines). The canonical list screen: `requestSeq` (~lines 251, 268, 279, 283, 286), the 300 ms debounce that also resets the page (~line 293), `messageFor()` (~lines 258–266), and the four-way loading / error / empty / no-results branch.
4. `frontend-vuejs/src/views/TicketDetailView.vue` — the **whole file** (1429 lines). Where the SLA panel goes. Note the per-section loading and error refs (~lines 616–653) and the `messageFor()` at ~line 725.
5. `frontend-vuejs/src/views/__tests__/TicketsView.spec.ts` — the **whole file**. The exact test harness to copy: `vi.mock('@/api/client')` (~line 9), the `vue-router` mock with `useRoute: () => ({ query: currentQuery })` (~lines 13–18), the `stubs` list in `mountTickets()` (~lines 22–33), and `vi.useFakeTimers()` in `beforeEach` (~line 42).
6. `frontend-vuejs/src/router/index.ts` — the routes array (~lines 15–82) and the guard (~lines 89–106). `meta.permission` is checked via `auth.can()` (~line 101) and a failure redirects to `dashboard`. **A route gated on a permission the user lacks silently bounces to the dashboard** — so a management-report route must not be linked for a user without `reports.read`.
7. `frontend-vuejs/src/components/layout/AppSidebar.vue` — `navItems` (~lines 45–52) and `visibleNavItems` (~lines 54–56). One new entry.
8. `frontend-vuejs/src/components/ui/` — `BaseCard`, `BaseButton`, `BaseInput`, `BaseBadge`, `BaseSpinner`, `EmptyState`, `BaseDialog`. **Use these; introduce no new primitive.**
9. `frontend-vuejs/src/composables/useFormat.ts` — `useFormat()` returns the locale-aware formatters. **Do not call `Intl` directly in a view.**
10. `frontend-vuejs/src/composables/useLocalizedName.ts` — `useLocalizedName()` picks `nameEn` / `nameAr` by locale. Use it for every bilingual name coming from the API.
11. `frontend-vuejs/src/composables/useTicketFilters.ts` — the whole file (70 lines). `TicketFilters` (~lines 3–10), `activeFilterCount` (~lines 28–36), `clearAllFilters` (~lines 40–47). **`slaStatus` is added here, not as a loose ref in a view.**
12. `frontend-vuejs/src/i18n/locales/en.json` and `ar.json` — 401 lines each, identical key sets. The `tickets` namespace starts at ~line 274; `customers` at ~line 158; `nav` at ~lines 18–26.
13. `frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts` — the whole file (50 lines). Asserts identical key sets **and** that no Arabic value is empty. Both assertions bind every string this story adds.
14. `frontend-vuejs/src/stores/auth.store.ts` — `can(permission)` (~lines 49–51), `roleCode` (~line 47), `user` (~line 39).

Grep targets:
- Grep for `requestSeq` in `frontend-vuejs/src/views/` — every screen that guards stale responses. The new views join that list.
- Grep for `section.welcome` / `feature.ticketManagement` in `frontend-vuejs/src/` — confirm `DashboardView.vue` is the only consumer before deciding what to do with those keys.
- Grep for `route.query` in `frontend-vuejs/src/views/TicketsView.vue` — determines whether task 4 is a change or a confirmation.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Drill-down links** | A tile navigates by pushing the backend's `filter` object **verbatim** as the query. The view never reconstructs a filter from its own understanding of the number — that is how a tile and its list drift apart. |
| **Non-clickable buckets** | A bucket whose `filter` is empty (the uncategorised category bucket from Story 19) renders as plain text, **not** a dead link. |
| **Zero is a value** | A count of `0` renders as `0`, never as a blank or a hidden row. |
| **Null is not zero** | `avgResolutionMinutes: null` renders as an em dash with a "no data" label, never as `0`. |
| **SLA colours** | `ON_TRACK` → success, `AT_RISK` → warning, `BREACHED` → danger, `MET` → neutral, `null` → nothing rendered at all. **Never a default badge for a missing policy** — it would imply a target that does not exist. |
| **Permission-aware** | The management route and its sidebar entry appear only with `reports.read`. A control the role cannot use is **not rendered**, not rendered-and-disabled. |
| **Stale responses** | Every fetch is `requestSeq`-guarded. |
| **Errors** | Mapped through a `messageFor()` per view: 403 → `errors.forbidden`, otherwise the server message falling back to `errors.unreachable`. |
| **Date range** | Both bounds optional; empty means all-time, matching the API. The screen labels the applied range from the API's echoed `range`, **not** from its own inputs — they can differ if the user typed and did not apply. |
| **No charts** | Breakdowns are tables and CSS-width bar rows. No library, no canvas, no SVG chart. |
| **Bilingual** | No hardcoded user-facing English. Identical key sets in both locale files. |

---

## Frontend Tasks

### 1 — Route and sidebar

**File: `frontend-vuejs/src/router/index.ts`**

Add inside the `AppLayout` children array, after the ticket pair (~lines 50–61):

```ts
{
  path: 'reports',
  name: 'reports',
  component: () => import('@/views/ReportsView.vue'),
  meta: { titleKey: 'nav.reports', permission: 'reports.read' },
},
```

The dashboard route (~lines 26–31) keeps its path, name, and component filename — only the file's contents change. Keeping the name matters: the guard redirects to `{ name: 'dashboard' }` (~lines 98, 103), and Story 22 adds a portal redirect that also targets it.

**File: `frontend-vuejs/src/components/layout/AppSidebar.vue`**

Add to `navItems` (~lines 45–52), after `tickets`:

```ts
{ name: 'reports', titleKey: 'nav.reports', icon: '📈', permission: 'reports.read' },
```

### 2 — Retire the placeholder dashboard content

**File: `frontend-vuejs/src/views/DashboardView.vue`** — replaced wholesale by task 3.

Its translation keys — `section.*` (~lines 95–102), `content.*` (~lines 103–112), `feature.*` (~lines 119–124), `step.*` (~lines 125–129), and `status.activeTickets` / `status.totalUsers` (~lines 130–136) — become unreferenced. **Grep each namespace across `frontend-vuejs/src/` before removing anything**; `action.getStarted` and parts of `status.*` may be used elsewhere.

Remove only the keys with **zero** remaining references, and remove them from **both** locale files in the same edit — `locale-parity.spec.ts` fails on a key removed from one and not the other. Leaving an unused key is harmless; removing it from one file is not. When in doubt, leave it.

### 3 — Agent workspace

**File: `frontend-vuejs/src/views/DashboardView.vue`** — rewrite.

Layout, top to bottom:

1. **Four stat tiles** in a responsive grid: My Open, My Breached, Unassigned, Branch Open. Each renders `count`, a label, and is a `RouterLink` built from its `filter`:
   ```ts
   function ticketsLinkFor(filter: Record<string, string>) {
     return { name: 'tickets', query: { ...filter } }
   }
   ```
   **Pass the object through untouched.** Do not re-key, re-case, or add parameters.
2. **My tickets by status** — a table of `CountBucket` rows: localized label, count, and a drill-down link. Every status appears, including zeros.
3. **My tickets by priority** — same shape.
4. **SLA breakdown** — one row per SLA status with the badge colour from the rules table, plus the `noPolicy` count rendered **without** a badge and with a hint explaining that those priorities have no policy configured.

Script section:

```ts
const loading = ref(true)
const loadError = ref('')
let requestSeq = 0

async function loadDashboard() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/dashboard/agent')
    if (seq !== requestSeq) return
    data.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

onMounted(loadDashboard)
```

Copy `messageFor()` from `TicketsView.vue` (~lines 406–414) rather than writing a new mapping.

A **Refresh** button calls `loadDashboard()` again. The four-way state branch (loading / error / empty / content) matches `CustomersView.vue` (~lines 31–47).

### 4 — SLA on the existing ticket screens

**Create file: `frontend-vuejs/src/components/tickets/SlaBadge.vue`**

```vue
<script setup lang="ts">
/**
 * Renders nothing when `sla` is null — a ticket whose priority has no policy
 * has no target, and a neutral badge would imply one.
 */
const props = defineProps<{ sla: { status: string } | null }>()
</script>
```

Maps `status` to a `BaseBadge` variant per the rules table and to the label key `tickets.sla.status.<STATUS>`.

**File: `frontend-vuejs/src/views/TicketsView.vue`**

- Add an **SLA** column rendering `<SlaBadge :sla="row.sla" />`.
- Add an SLA filter select to the filter row with options All / On Track / At Risk / Breached / Met, bound to a new `slaStatus` ref.
- Include `slaStatus` in the query string sent to `GET /tickets` (Story 16 added the parameter).
- **Seed the filter state from `route.query` on mount**, so a dashboard tile link lands on a pre-filtered list. Grep for `route.query` first: if `TicketsView.vue` already hydrates from it, add `slaStatus` to that path; if it does not, add the hydration — it is what makes every drill-down in this story work.

**File: `frontend-vuejs/src/composables/useTicketFilters.ts`**

Add `slaStatus` alongside the existing refs (~lines 21–26), include it in `activeFilterCount` (~lines 28–36), in `clearAllFilters` (~lines 40–47), and in the `TicketFilters` interface (~lines 3–10). **All four places** — a filter added to the state and forgotten in `clearAllFilters` is the classic sticky-filter bug.

**File: `frontend-vuejs/src/views/TicketDetailView.vue`**

Add an **SLA** card after the profile card: the badge, the two due dates through `useFormat`, and the response and resolution states. When `ticket.sla` is null, render the card with a single line explaining that no SLA policy is configured for this priority — **do not hide the card**, or the absence looks like a loading failure.

### 5 — Management dashboard

**Create file: `frontend-vuejs/src/views/ReportsView.vue`**

Sections:

1. **Date range** — two `BaseInput type="date"` fields and an **Apply** button. Empty means all-time. The applied range is labelled from the API's echoed `range` object, not from the inputs.
2. **Totals** — four tiles: total, open, closed, unassigned.
3. **By status / by priority / by category / by channel** — four tables, each with a label, a count, a percentage of total, and a CSS bar row:
   ```html
   <div class="bar" :style="{ inlineSize: pct(bucket.count) }" />
   ```
   **`inlineSize`, not `width`** — the app supports RTL and a physical property mirrors wrongly. Grep `frontend-vuejs/src/assets/styles/main.css` for existing logical-property usage and match it.
4. **Agent workload** — a table of agent, open, resolved, breached, each row linking to the filtered list. The `UNKNOWN` bucket from Story 19 renders with a "deleted user" label and no link.
5. **Resolution stats** — resolved count, average and median minutes through `useFormat`. `null` renders as an em dash with the "no data" label.
6. **SLA indicators** — the same bucket rows as the agent dashboard, plus a breach percentage.

Same `requestSeq` guard, same `messageFor()`, same four-way state branch. One fetch: `GET /reports/overview` with the range parameters.

### 6 — Translations

**Files: `frontend-vuejs/src/i18n/locales/en.json` and `ar.json`**

Add `nav.reports` (`"Reports"` / `"التقارير"`) and two namespaces, mirroring the structure of `tickets` (~line 274 in both):

```
dashboard.title, refresh, myOpen, myBreached, unassigned, branchOpen
dashboard.section.{byStatus,byPriority,sla}
dashboard.sla.noPolicy, dashboard.sla.noPolicyHint
dashboard.empty.{title,description}

reports.title, apply, allTime, rangeLabel
reports.totals.{total,open,closed,unassigned}
reports.section.{byStatus,byPriority,byCategory,byChannel,workload,resolution,sla}
reports.columns.{label,count,percent,agent,open,resolved,breached}
reports.uncategorized, reports.unknownAgent
reports.resolution.{count,average,median,minutes,noData}
reports.empty.{title,description}

tickets.sla.label
tickets.sla.status.{ON_TRACK,AT_RISK,BREACHED,MET}
tickets.sla.{responseDue,resolutionDue,respondedAt,resolvedAt,noPolicy}
tickets.filter.allSla
```

**Status, priority, and category display names come from the API** (`labelEn` / `labelAr` on each bucket) through `useLocalizedName`. Do **not** duplicate them as translation keys — that is what makes a category added in Story 20 appear here without a code change.

Arabic values must be real translations, not placeholders: `locale-parity.spec.ts` (~lines 34–49) fails on an empty string, and a copied English value would pass the test while breaking the screen.

---

## Edge Cases & Failure Modes

- **An agent with no tickets.** Every tile shows `0` and every bucket table lists its statuses with `0`. The empty state is **not** shown — zeros are the answer. Reserve `EmptyState` for a genuinely absent response.
- **A `filter` object the ticket list rejects.** Story 19 asserts every emitted filter parses under `listTicketsQuerySchema`, but a view that re-keys the object breaks that guarantee. **Spread it verbatim.** Cover it with a test that asserts the pushed query equals the mocked `filter`.
- **A bucket with an empty `filter`** (uncategorised). Rendered as plain text. Linking with an empty query would silently navigate to the unfiltered list and present every ticket as if it were uncategorised.
- **`sla: null` on a ticket row.** `SlaBadge` renders nothing. A neutral badge would claim a target the ticket does not have.
- **`avgResolutionMinutes: null`.** Em dash plus "no data". Rendering `0` claims instant resolution.
- **A user without `reports.read` navigating to `/reports` directly.** The router guard (~line 101) redirects to `dashboard`. **Silently** — the sidebar entry is already hidden, so this only happens with a pasted URL. Do not add an error toast; the redirect is the designed behaviour.
- **A user whose permissions change mid-session.** `auth.can()` reads the store, which `restore()` refreshes from `/auth/me` on reload. A permission removed server-side takes effect on the next full load, not immediately. Existing behaviour, unchanged here.
- **A slow dashboard response followed by a fast refresh.** The `requestSeq` guard drops the stale one. Without it the older numbers overwrite the newer ones and the screen quietly lies.
- **A 403 from `/reports/overview`.** Only reachable via a direct API call or a stale token; `messageFor` maps it to `errors.forbidden`.
- **A network failure.** `ApiError` with `code: 'NETWORK_ERROR'` and `status: 0` (`api/client.ts` ~lines 69–76). `messageFor` must handle status `0` — `TicketsView.vue`'s existing mapping is the reference.
- **A very long agent name in the workload table.** Constrain the cell and let it wrap; do not truncate with `text-overflow` on an RTL-capable table, where the ellipsis lands on the wrong side.
- **Arabic numerals and the bar rows.** Counts go through `useFormat`'s number formatter so digits follow the locale. Bar widths use `inlineSize`, so bars grow from the correct edge in both directions. **Verify by switching the locale, not by reasoning about it.**
- **A date input in Arabic locale.** `<input type="date">` renders with the browser's own locale, which may not match the app's. Accept that; the applied range is labelled from the API echo through `useFormat`, so the authoritative display is consistent even when the picker is not.
- **`from` after `to`.** The API returns 422 (Story 19). Map it to a specific message on the range field rather than the generic error banner.
- **Removing a translation key from one locale file only.** `locale-parity.spec.ts` fails. That is the intended safety net for task 2 — run the frontend tests immediately after the removal, not at the end.

---

## Test Plan

1. **Unit — create `frontend-vuejs/src/components/tickets/__tests__/SlaBadge.spec.ts`.**
   - Renders nothing when `sla` is `null`.
   - Each of the four statuses maps to its documented badge variant.
   - The label comes from `tickets.sla.status.<STATUS>` and changes with the locale.
2. **Unit — extend `frontend-vuejs/src/composables/__tests__/` with `useTicketFilters.spec.ts`** (create if absent).
   - Setting `slaStatus` increments `activeFilterCount`.
   - `clearAllFilters()` resets `slaStatus` to `undefined` along with every other filter.
   - `filters` exposes `slaStatus`.
3. **Component — create `frontend-vuejs/src/views/__tests__/DashboardView.spec.ts`.** Copy the harness from `TicketsView.spec.ts` (~lines 1–33).
   - Mounts, calls `GET /dashboard/agent` exactly once, renders the four tile counts.
   - A tile's `RouterLink` `to.query` **deep-equals** the mocked `filter` object — the drill-down contract.
   - A bucket with `count: 0` renders `0` and is present in the DOM.
   - A bucket with an empty `filter` renders **no** `RouterLink`.
   - An API rejection renders the error branch, not the empty state.
   - A slow first request followed by a fast second leaves the **second** response rendered.
4. **Component — create `frontend-vuejs/src/views/__tests__/ReportsView.spec.ts`.**
   - Renders one row per bucket across all four breakdowns.
   - `avgResolutionMinutes: null` renders the no-data label and not `0`.
   - The `UNKNOWN` agent row renders without a link.
   - Applying a date range issues exactly **one** new request carrying both parameters.
   - Clearing both inputs issues a request with neither parameter.
   - A 422 on `from`/`to` renders the range-specific message.
   - The applied-range label reflects the API's echoed `range`, not the input values.
5. **Component — extend `frontend-vuejs/src/views/__tests__/TicketsView.spec.ts`.**
   - The SLA column renders a badge for a ticket with `sla` and nothing for one without.
   - Choosing an SLA filter issues one request containing `slaStatus`.
   - Mounting with `currentQuery = { slaStatus: 'BREACHED', assignedUserId: 'x' }` sends **both** parameters on the first request — the arrival-from-dashboard case.
6. **Component — extend `frontend-vuejs/src/views/__tests__/TicketDetailView.spec.ts`.**
   - The SLA card renders both due dates for a ticket with a policy.
   - It renders the no-policy line — and is **still present** — when `sla` is null.
7. **i18n — `frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts` runs unchanged.** It must pass after both the additions and the task-2 removals.
8. **Regression:** `npm run test` in `frontend-vuejs/`. `TicketsView.spec.ts` and `TicketDetailView.spec.ts` gain assertions; **their existing ones must pass unchanged.**

---

## Verification Steps

1. **Frontend typechecks:** `npm run type-check` in `frontend-vuejs/`.
2. **Frontend tests:** `npm run test` in `frontend-vuejs/`.
3. **Lint:** `npm run lint` in `frontend-vuejs/`.
4. **Frontend runs:** `npm run dev` in `frontend-vuejs/` with the backend on `npm run dev` in `backend-nodejs/`, then:
   - Sign in as `agent@azm.local` → the dashboard shows real counts, **no** `12` or `5`.
   - Click **My Open** → the ticket list opens pre-filtered and its result count matches the tile.
   - Click a status bucket → the list is filtered to that status.
   - **Reports** is **absent** from the sidebar for this account.
   - Navigate to `/reports` directly → redirected to the dashboard.
   - The ticket list shows an SLA column; filter by **Breached** and confirm the rows.
   - Open a ticket → the SLA card shows both due dates. Open a ticket whose priority has no policy → the card shows the no-policy line.
5. **Manager check:** sign in as `manager@azm.local` → **Reports** appears; the page loads; `byStatus` counts sum to the total tile. Apply a range in the future → all zeros with the no-data label, not blanks.
6. **Bilingual and RTL:** switch to Arabic on both new screens. Every label is Arabic, the layout mirrors, and **the bar rows grow from the right**. Digits follow the locale.
7. **Regression:** re-walk Story 14's flow — ticket list, create, detail, transition, assign, notes, attachments — and confirm nothing broke.

---

## Done Criteria

- [ ] `DashboardView.vue` contains no static demo content and no hardcoded counts.
- [ ] Unreferenced placeholder translation keys are removed from **both** locale files, or left in both; never one.
- [ ] The agent workspace renders four live tiles, two bucket tables, and an SLA breakdown from one `GET /dashboard/agent`.
- [ ] Every tile and bucket links to `/tickets` with the backend's `filter` object spread **verbatim**, asserted by a test.
- [ ] A bucket with an empty filter renders as text, not a link.
- [ ] A count of `0` renders as `0`.
- [ ] `TicketsView.vue` has an SLA column and an SLA filter wired to `slaStatus`.
- [ ] The ticket list hydrates its filters from `route.query`, so a dashboard link lands pre-filtered.
- [ ] `slaStatus` is in `useTicketFilters`'s state, `activeFilterCount`, `clearAllFilters`, and `TicketFilters`.
- [ ] `TicketDetailView.vue` shows an SLA card that stays visible, with an explanation, when no policy applies.
- [ ] `SlaBadge` renders nothing for `sla: null`.
- [ ] `/reports` exists, is gated on `reports.read`, and its sidebar entry is hidden without it.
- [ ] The management view renders totals, four breakdowns, workload, resolution stats, and SLA indicators.
- [ ] `avgResolutionMinutes: null` renders as no-data, never `0`.
- [ ] The applied date range is labelled from the API's echoed `range`.
- [ ] Bar rows use `inlineSize` and mirror correctly in Arabic.
- [ ] No charting library is added.
- [ ] Every fetch is `requestSeq`-guarded.
- [ ] `en.json` and `ar.json` have identical key sets and no empty Arabic value.
- [ ] All new and existing frontend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 22.**
