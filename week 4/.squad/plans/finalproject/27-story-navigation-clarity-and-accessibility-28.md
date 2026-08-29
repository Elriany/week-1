# Story 27 — Navigation, Screen Clarity & Accessibility (Story: 28)

## Prerequisites

- **Story 26 completed** ([26-story-design-system-pass-28.md](26-story-design-system-pass-28.md)) — the token file is complete, `:focus-visible` exists globally, and the tables share one treatment. **Task 4 below depends on that focus ring**: a focus trap is pointless if focus is invisible.
- **Story 25 completed** ([25-story-dead-code-and-duplication-sweep-28.md](25-story-dead-code-and-duplication-sweep-28.md)) — the scaffold views are gone, leaving `AboutView.vue` as the last scaffold-era route.

**This is a frontend-only story. `No backend changes required.`**

---

## Story Goal

Work item tasks 7 ("Navigation & Screen Clarity"), 8 ("Accessibility & Usability"), and the copy half of task 11 ("Final Product Cleanup"):

1. **Group the sidebar.** Thirteen flat items with no headings, one of which is a leftover.
2. **Add breadcrumbs.** Five routes are one level deep and the topbar shows them their **parent's** title, so a user on a ticket detail page sees the word "Tickets" and nothing else.
3. **Make dialogs keyboard-operable.** There is **not one `keydown` handler in the entire frontend** — no dialog closes with Escape, none traps focus, none returns focus on close. Every create, edit, and confirm flow in the application is a dialog.
4. **Label every form control.** Eight `<textarea>` elements and 25 `<select>` elements; `UsersView.vue` has **one** `<label>` for the whole screen.
5. **Localise the strings that were missed** — two hardcoded English `aria-label`s and the sidebar brand.
6. **Give a blocked navigation an explanation** instead of a silent bounce to the dashboard.
7. **Remove the last placeholder screen and the last placeholder card.**

**Not in scope:**
- Colour, spacing, or any `<style>` change beyond what a new element needs. Story 26 settled the visual language.
- New capabilities, new routes to new features, or a redesigned information architecture. Grouping and labelling only.
- Wiring the customer attachments and history panels — **Story 28 owns that**, because it is an integration question, not a navigation one. This story only removes the empty card standing in their place.

---

## Context — Read These Files First

1. `frontend-vuejs/src/components/layout/AppSidebar.vue` — **lines 31–71**. The `NavItem` interface with its `permission` / `roles` / `excludeRoles` fields, the thirteen-entry `navItems` array, and the `visibleNavItems` filter. Task 1 restructures the array and the template around it; **the filter logic is correct and must be preserved exactly** — it is what keeps a customer out of the staff screens.
2. `frontend-vuejs/src/components/layout/AppTopbar.vue` — the **whole file** (145 lines). **Line 11** renders `t(currentPageTitle)` from `route.meta.titleKey`. **Line 15** is a `<slot name="actions" />` that no caller fills. **Line 62** is `const menuButtonLabel = computed(() => 'Toggle menu')` — hardcoded English on the only control that opens the mobile navigation.
3. `frontend-vuejs/src/components/layout/AppLayout.vue` — the **whole file** (46 lines). Renders `<AppTopbar />` with **no slot content**, which is why line 15 above is dead. Task 2 inserts the breadcrumb here or in the topbar — decide once and say which.
4. `frontend-vuejs/src/router/index.ts` — the **whole file** (182 lines). The `RouteMeta` augmentation at **lines 5–13** (`titleKey`, `public`, `permission`), the routes at **15–136**, and the guard at **143–175**. Note **line 171**: `return { name: 'dashboard' }` on a failed permission check — a silent redirect. Note **lines 122–127**: the `about` route.
5. `frontend-vuejs/src/views/AboutView.vue` — the **whole file** (154 lines). A "System Health" card calling `GET /api/v1/health`, plus an "About" card. The last scaffold-era screen, and the only nav item every role including `CUSTOMER` can see.
6. `frontend-vuejs/src/views/CustomerDetailView.vue` — **lines 288–293**. An empty `BaseCard` wrapping an empty `<div class="placeholder">`, introduced by two comments reading `Story 10: Placeholder for attachments and interaction history`. Renders as a blank white card on every customer.
7. `frontend-vuejs/src/components/ui/BaseDialog.vue` — the **whole file** as Story 26 left it. **Line 8** already has `role="dialog"`, `aria-modal`, and `aria-labelledby`. What it lacks is any keyboard behaviour. **Line 14** is `aria-label="Close dialog"` in English.
8. `frontend-vuejs/src/components/ui/BaseInput.vue` — **lines 2–16**. The one component that gets labelling right: `useId()`, `:for`, `:aria-invalid`. It is still missing `aria-describedby` on the error at line 15. Use its shape as the model for tasks 3 and 5.
9. `frontend-vuejs/src/views/TicketsView.vue` — **lines 210–222**. The create dialog's description `<textarea>`: no `<label>`, no `aria-label`, and its placeholder is `t('tickets.notes.placeholder')`, which reads **"Add a note..."** on a ticket **description** field.
10. `frontend-vuejs/src/views/UsersView.vue` — the **whole file**. One `<label>` in a full create-and-edit CRUD screen. The clearest instance of the pattern task 3 fixes.
11. `frontend-vuejs/src/i18n/locales/en.json` and `ar.json` — **476 keys each**. The `nav` namespace, and the `section` / `content` / `info` / `action` / `status` namespaces that `AboutView.vue` is the main consumer of.
12. `frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts` — enforces identical key sets and no empty Arabic value. Every key added or removed in this story goes into **both** files.
13. `frontend-vuejs/src/router/__tests__/guards.spec.ts` — the existing guard tests. Task 6 changes guard behaviour; extend this file, do not start a new one.
14. [../completion/22-story-knowledge-base-and-customer-portal-screens-27.md](../completion/22-story-knowledge-base-and-customer-portal-screens-27.md) — established the role-aware sidebar and the customer redirects this story builds on.

Grep targets:
- `grep -rn "keydown\|keyup\|Escape" frontend-vuejs/src/` — **returns nothing today.**
- `grep -rn "<textarea" frontend-vuejs/src --include=*.vue` — 8 hits.
- `grep -rn "<select" frontend-vuejs/src --include=*.vue` — 25 hits.
- `grep -rnE 'aria-label="[A-Z]' frontend-vuejs/src --include=*.vue` — hardcoded English labels.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Sidebar grouping** | Three groups: **Work**, **Knowledge**, **Administration**. A group header renders only when at least one of its items is visible to the signed-in user — an empty "Administration" heading above nothing is worse than no heading. |
| **Permission filtering is unchanged** | `visibleNavItems` already implements the role and permission rules correctly. Grouping wraps it; it does not replace it. A regression here is a **security** regression, not a cosmetic one. |
| **Breadcrumbs on depth-2 routes only** | `customer-detail`, `ticket-detail`, `kb-article`, `portal-ticket-detail`, `admin-sla`. A top-level route shows its title alone — a one-item breadcrumb is noise. |
| **Escape closes every dialog** | Including confirmation dialogs. `closeOnBackdrop` already exists as an opt-out for backdrop clicks; **Escape has no opt-out** — a modal a keyboard user cannot leave is a trap. |
| **Focus returns where it came from** | Opening a dialog moves focus into it; closing returns focus to the element that opened it. |
| **Every control has an accessible name** | A `<label for>` where a visible label belongs, `aria-label` where the design has no room for one. A placeholder is **not** a label — it disappears on input. |
| **A blocked navigation says so** | Silent redirection makes a permission problem look like a broken link. |
| **Bilingual** | Identical key sets in both locale files, no empty Arabic value. No user-visible English string in a `.vue` file. |

---

## Frontend Tasks

### 1 — Group the sidebar and remove the leftover item

**File: `frontend-vuejs/src/components/layout/AppSidebar.vue`**

Add a `group` field to `NavItem` and a group ordering constant:

```ts
type NavGroup = 'work' | 'knowledge' | 'admin'

const NAV_GROUPS: { key: NavGroup; titleKey: string }[] = [
  { key: 'work', titleKey: 'nav.groups.work' },
  { key: 'knowledge', titleKey: 'nav.groups.knowledge' },
  { key: 'admin', titleKey: 'nav.groups.admin' },
]
```

Assign each existing item, **changing none of its `permission` / `roles` / `excludeRoles` values**:

| Item | Group |
|---|---|
| `dashboard`, `portal-tickets`, `portal-new-ticket`, `tickets`, `customers` | `work` |
| `kb`, `reports` | `knowledge` |
| `users`, `roles`, `admin`, `admin-sla`, `audit` | `admin` |

**Delete the `about` entry (line 62) entirely** — task 7 removes the screen.

Then derive the rendered structure from the existing filter, so the permission logic stays in one place:

```ts
const visibleGroups = computed(() =>
  NAV_GROUPS
    .map(g => ({ ...g, items: visibleNavItems.value.filter(i => i.group === g.key) }))
    // A heading with nothing under it reads as a broken menu.
    .filter(g => g.items.length > 0),
)
```

Template: a `<ul>` per group with an `<li>` heading, `role="presentation"` on the heading item, and `aria-label` on the `<nav>`. Add `:aria-current="isActive ? 'page' : undefined"` to each `RouterLink` — `router-link-active` gives the visual state but nothing announces it.

Also **localise the brand.** Line 6 is a literal `<h1>AZM CRM</h1>`; replace with `{{ t('app.title') }}` (the key already exists — `router/index.ts:178` falls back to it).

New i18n keys, in **both** locale files: `nav.groups.work`, `nav.groups.knowledge`, `nav.groups.admin`.

### 2 — Add breadcrumbs

**File: `frontend-vuejs/src/router/index.ts`**

Extend the `RouteMeta` augmentation at lines 5–13:

```ts
/** Route name of the list this detail page belongs to. Drives the breadcrumb.
 *  Present only on depth-2 routes. */
parent?: string
```

Set it on five routes: `customer-detail` → `customers`, `ticket-detail` → `tickets`, `kb-article` → `kb`, `portal-ticket-detail` → `portal-tickets`, `admin-sla` → `admin`.

**Create file: `frontend-vuejs/src/components/layout/AppBreadcrumb.vue`**

Reads `route.meta.parent`, resolves that route's `titleKey`, and renders `<nav aria-label="breadcrumb">` with an ordered list: parent link → current page. Renders **nothing** when `meta.parent` is absent, so top-level routes are unaffected.

The current record's own label comes from a new optional `meta.itemLabel` the view sets — a ticket detail page should read "Tickets / TKT-000123", not "Tickets / Tickets". Expose it through the existing `app.store`, which already holds cross-layout UI state, and have each of the five detail views set it once the record loads and clear it on unmount. **If a view has not set it, fall back to `meta.titleKey`** — the breadcrumb must never render a blank trailing segment while data is loading.

**File: `frontend-vuejs/src/components/layout/AppTopbar.vue`** — render `<AppBreadcrumb />` above the `<h1 class="title">`, inside `.left`. Keep the existing title; the breadcrumb sits above it as context, not as a replacement.

New i18n key in both files: `nav.breadcrumbLabel` for the `aria-label`.

### 3 — Label every form control

Work through the eight `<textarea>` and 25 `<select>` elements. For each:

- **A visible label belongs there** → wrap in `<label class="field">` with a `<span>` caption, matching the `select-field` pattern already used at `TicketsView.vue:222–224`.
- **The design has no room** (a table filter, an inline search) → `:aria-label="t('…')"`.

**Never leave a placeholder as the only name.** `TicketsView.vue:215–219` is the reference case: a description `<textarea>` with no label whose placeholder reads **"Add a note..."**. Give it a real label (`t('tickets.columns.description')`, adding the key if absent) and a correct placeholder key — `tickets.create.descriptionPlaceholder`, new in both locale files.

`UsersView.vue` has one `<label>` for an entire CRUD screen and needs the most work; do it first and use the result as the template for the rest.

**File: `frontend-vuejs/src/components/ui/BaseInput.vue`** — connect the error text at line 15 to the input:

```vue
<input … :aria-invalid="Boolean(error)" :aria-describedby="error ? errorId : undefined" />
<span v-if="error" :id="errorId" class="error" role="alert">{{ error }}</span>
```

with `errorId` from `useId()` alongside `inputId`. Every form in the application uses this component, so one edit fixes error announcement everywhere.

### 4 — Make dialogs keyboard-operable

**File: `frontend-vuejs/src/components/ui/BaseDialog.vue`**

There is no `keydown` handler anywhere in the project. Add three behaviours to this one component and every dialog in the application gets them:

**Escape closes.** Attach on `document` while open, remove on close and on unmount:

```ts
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'Tab') trapFocus(e)
}
```

Bind on the `isOpen` watcher, not on mount — the component is always mounted; only `isOpen` changes. **`closeOnBackdrop` does not gate this.** A dialog that refuses a backdrop click is guarding against a misclick; one that refuses Escape is a trap.

**Focus moves in and comes back.** On open, record `document.activeElement`, then focus the first tabbable element inside `.dialog-content` (or `.dialog-content` itself with `tabindex="-1"` if it holds none). On close, restore focus to the recorded element. Without this, closing a dialog drops focus onto `<body>` and the next Tab starts from the top of the page.

**Tab cycles inside.** Collect tabbable descendants; on `Tab` at the last, wrap to the first; on `Shift+Tab` at the first, wrap to the last. A single query selector and two boundary checks — no focus-trap library, per the work item's no-new-dependency rule.

Also localise line 14: `:aria-label="t('common.closeDialog')"`, key added to both locale files.

### 5 — Localise the two remaining hardcoded strings

**File: `frontend-vuejs/src/components/layout/AppTopbar.vue`** — line 62:

```ts
const menuButtonLabel = computed(() => t('nav.toggleMenu'))
```

It is the accessible name of the **only** control that opens navigation on mobile, and it is English for every Arabic user today.

**Also delete line 15's `<slot name="actions" />`.** `AppLayout.vue` renders `<AppTopbar />` with no slot content and is the component's only caller. An unused named slot invites a future reader to fill a slot that never renders.

**File: `frontend-vuejs/src/components/layout/AppTopbar.vue`** — while here, merge the two `@media (max-width: 768px)` blocks at lines 122 and 128.

Then re-run `grep -rnE 'aria-label="[A-Z]|title="[A-Z]|placeholder="[A-Z]' frontend-vuejs/src --include=*.vue` and localise anything else it finds.

### 6 — Explain a blocked navigation

**File: `frontend-vuejs/src/router/index.ts`** — line 171.

```ts
if (to.meta.permission && !auth.can(to.meta.permission)) {
  return { name: 'dashboard' }
}
```

A user who follows a stale link or types a URL is bounced to the dashboard with no indication anything happened — indistinguishable from a broken link, which is exactly what the work item's task 1 asks to eliminate.

Redirect to the dashboard **carrying the reason**, and have the dashboard surface it once:

```ts
return { name: 'dashboard', query: { denied: String(to.name ?? to.path) } }
```

**File: `frontend-vuejs/src/views/DashboardView.vue`** — when `route.query.denied` is present, render a dismissible banner using the existing `errors.forbidden` string, then replace the URL without the query so a reload does not repeat it.

Keep the two `CUSTOMER` redirects at lines 157–168 **silent** — they are routing a customer to their own home, not denying them anything, and a warning there would be alarming and wrong.

### 7 — Remove the last placeholders

**Delete `frontend-vuejs/src/views/AboutView.vue`.** Remove its route (`router/index.ts` lines 122–127) and its `navItems` entry (removed in task 1). It is a scaffold-era screen whose only real content is a raw `/health` reading, visible to every role including customers, and the work item's task 11 calls for removing exactly this.

Then remove **only** the i18n keys nothing else references. Candidates: `section.about`, `content.about.*`, `section.systemHealth`, `info.timestamp`, `info.environment`, `action.loadData`, `status.noData`, `content.noDataAvailable`, `errors.loadingHealth`, `nav.about`. **Check each one individually** with `grep -rn "'<key>'" frontend-vuejs/src/` before deleting, and delete from **both** locale files or neither. `/api/v1/health` and `/health` stay on the server; they are operational endpoints and nothing about this task touches them.

**File: `frontend-vuejs/src/views/CustomerDetailView.vue`** — delete **lines 288–293**, the empty `BaseCard` and its `Story 10: Placeholder` comments, along with the now-orphaned `.placeholder` rule at line 779. A blank white card on every customer detail page is the single most visible sign of an unfinished product. **Story 28 puts the real attachments and history panels in this position** — leave the surrounding layout intact so that insertion is clean.

### 8 — Give every screen a purpose line

Each of the seventeen routes has a title but several have no statement of what the screen is for. Add a one-line description under the page heading on the screens where the purpose is not self-evident from the table: `/reports`, `/audit`, `/admin`, `/admin/sla`, `/kb`.

One `<p class="page-subtitle">` per screen, one new i18n key per screen in both files, styled once in `main.css` with `--color-gray-600` and `--font-size-sm`. Do **not** add one where the table already says it — `/users`, `/customers`, `/tickets` need nothing.

---

## Edge Cases & Failure Modes

- **Grouping the sidebar can silently widen access.** `visibleNavItems` is the only thing keeping a `CUSTOMER` from seeing staff links. If the group mapping is built from `navItems` instead of `visibleNavItems`, every role sees every heading and item. Build groups from the **filtered** list, and cover it with a test that signs in as `CUSTOMER` and asserts the `admin` group is absent.
- **An empty group heading.** A Manager holds `reports.read` but not `admin.manage`; without the `.filter(g => g.items.length > 0)` they see an "Administration" heading over nothing.
- **`meta.parent` on a route the user cannot reach.** `admin-sla`'s parent is `admin`, gated on `admin.manage` while the child is gated on `sla.manage`. A user with `sla.manage` alone would see a breadcrumb link that bounces them. **Render the parent segment as plain text, not a link, when `auth.can()` fails for the parent's permission.**
- **`meta.itemLabel` outliving its route.** If a detail view sets the label and does not clear it on unmount, the next screen shows the previous record's name. Clear in `onUnmounted` **and** default to `meta.titleKey` whenever `meta.parent` is absent.
- **Escape inside a dialog that contains a `<select>`.** A native dropdown consumes the first Escape to close itself. That is correct browser behaviour — do not `preventDefault` your way around it.
- **The focus trap and `teleport`.** `BaseDialog` teleports to `body`, so the tabbable query must run against the teleported `.dialog-content`, not against the component's original position. Query after `nextTick` following the `isOpen` change.
- **Restoring focus to a removed element.** A dialog that deletes a row leaves the opening button gone. Guard with `document.contains(previous)` and fall back to the page heading.
- **`document` keydown listeners leak.** Two dialogs mounted at once (a delete confirmation over an edit form) both listen. Remove on `isOpen === false` and in `onUnmounted`, and let the outermost handle it — or check `e.defaultPrevented` before acting.
- **Deleting an i18n key that is built by interpolation.** The same hazard Story 25 documented. `status.*` and `action.*` are shallow, generic namespaces used across several screens; grep each key before removing it, and run `locale-parity.spec.ts` after.
- **Deleting `AboutView.vue` while `guards.spec.ts` references the `about` route.** Grep the specs for `'about'` before removing the route.
- **The `denied` query parameter is user-controlled.** It ends up in a rendered banner. Render it as **text only** — never as a translation key lookup and never through `v-html`. The safest form displays the generic `errors.forbidden` message and uses the parameter only to decide *whether* to show the banner.
- **The breadcrumb adds vertical height to the topbar.** At 768 px the topbar already holds the menu button, the title, the language switcher, the account name, the role badge, and sign-out. Verify the breadcrumb does not push the account controls onto a second line; hide it below 768 px if it does — the mobile back path is the browser's.

---

## Test Plan

1. **Extend** `frontend-vuejs/src/components/layout/__tests__/AppSidebar.spec.ts` — for each of Administrator, Manager, Agent, and Customer: assert which group headings render and that a group with no visible items renders **no heading**. The Customer case is the security-relevant one: no `admin` group, no `users`, no `tickets`.
2. **Add** `frontend-vuejs/src/components/layout/__tests__/AppBreadcrumb.spec.ts` — renders nothing without `meta.parent`; renders parent-plus-current with it; renders the parent as plain text when the user lacks the parent's permission; falls back to `meta.titleKey` when `itemLabel` is unset.
3. **Add** `frontend-vuejs/src/components/ui/__tests__/BaseDialog.spec.ts` — Escape emits `close` even with `closeOnBackdrop: false`; focus lands inside on open; focus returns to the opener on close; Tab from the last tabbable wraps to the first. Mount with a real button as the opener so the restore path is exercised.
4. **Add** to `frontend-vuejs/src/router/__tests__/guards.spec.ts` — a permission-denied navigation lands on `dashboard` **with** a `denied` query parameter; the two `CUSTOMER` redirects carry **no** query parameter.
5. **Add** an accessibility assertion to `UsersView.spec.ts`, `TicketsView.spec.ts`, and `CustomersView.spec.ts` — every `input`, `select`, and `textarea` in the rendered output has an accessible name (a `<label for>` pointing at its `id`, or a non-empty `aria-label`). One helper shared across the three specs; it is the guard that stops task 3 regressing.
6. **Run unchanged and expect green:** `locale-parity.spec.ts` after every key addition and removal.
7. **Delete** any spec case that referenced the `about` route or `AboutView.vue`.
8. **Run unchanged and expect green:** every other frontend spec, and every backend test — this story touches no backend file.

---

## Verification Steps

1. **No hardcoded UI English:** `grep -rnE 'aria-label="[A-Z]|>[A-Z][a-z]+ [a-z]+<' frontend-vuejs/src --include=*.vue` returns only matches inside comments or `t()` calls.
2. **Keyboard handling exists:** `grep -rn "keydown" frontend-vuejs/src/` returns the `BaseDialog` handler (nothing today).
3. **The scaffold screen is gone:** `ls frontend-vuejs/src/views/AboutView.vue` fails and `grep -rn "AboutView\|'about'" frontend-vuejs/src/` returns nothing.
4. **The placeholder card is gone:** `grep -rn "placeholder\"" frontend-vuejs/src/views/CustomerDetailView.vue` returns nothing, and the customer detail page shows no empty card.
5. **Frontend runs — keyboard only.** With `npm run dev`, unplug the mouse for these: sign in using only the keyboard; Tab to the sidebar and open Tickets; Tab to "Add ticket" and press Enter; Tab through every field of the create dialog; press Escape and confirm it closes **and** that focus is back on the "Add ticket" button; reopen and submit with Enter.
6. **Screen reader sanity:** with Windows Narrator or NVDA on `/users`, every field announces a name, and the sidebar announces its groups and the current page.
7. **Breadcrumbs:** visit each of the five depth-2 routes and confirm the trail reads *Parent / This record*, that the parent link works, and that a user lacking the parent's permission sees plain text.
8. **Blocked navigation:** sign in as Agent, navigate directly to `/audit`, and confirm the dashboard shows the explanatory banner once and that reloading does not repeat it.
9. **Bilingual:** repeat steps 5, 7, and 8 in Arabic. Group headings, breadcrumbs, the menu button's label, and the dialog close label are all Arabic; the breadcrumb separator points the correct way.
10. **Responsive:** at 768 px the topbar does not wrap; at 375 px the sidebar drawer opens and closes and the breadcrumb is either legible or hidden by design.
11. **Frontend typechecks, tests, lints, builds:** `npm run type-check`, `npx vitest run`, `npm run lint`, `npm run build`.
12. **Backend regression:** `npm test` in `backend-nodejs/` — unchanged.

---

## Done Criteria

- [ ] The sidebar renders three groups, each heading only when it has a visible item, and permission filtering is provably unchanged for all four roles.
- [ ] `about` is gone from the navigation, the router, and the file system; its i18n keys are removed from **both** locale files or verified as still in use.
- [ ] The five depth-2 routes render a breadcrumb naming the actual record; top-level routes render none.
- [ ] A breadcrumb parent the user cannot reach renders as text, not a link.
- [ ] Escape closes every dialog, regardless of `closeOnBackdrop`.
- [ ] Opening a dialog moves focus into it; closing returns focus to the opener; Tab cycles within it.
- [ ] `BaseInput` links its error text with `aria-describedby` and `role="alert"`.
- [ ] Every `input`, `select`, and `textarea` on the users, customers, and tickets screens has an accessible name, enforced by a test.
- [ ] The ticket description field has a real label and a placeholder that no longer says "Add a note...".
- [ ] The menu button's `aria-label`, the dialog close label, and the sidebar brand are all localised.
- [ ] The dead `<slot name="actions" />` is removed and the duplicate media query in `AppTopbar.vue` is merged.
- [ ] A permission-denied navigation shows an explanation once; the two customer redirects stay silent.
- [ ] The empty placeholder card on the customer detail page is gone, with the layout left ready for Story 28.
- [ ] `/reports`, `/audit`, `/admin`, `/admin/sla`, and `/kb` each state their purpose in one line.
- [ ] `locale-parity.spec.ts` passes; both locale files hold identical key sets with no empty Arabic value.
- [ ] Every frontend and backend test passes and both projects build.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 28.**
