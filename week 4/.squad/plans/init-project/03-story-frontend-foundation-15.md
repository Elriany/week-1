# Story 03 — Frontend foundation: Vue 3 + TypeScript, Router, Pinia, UI primitives and app shell (Story: 15)

## Prerequisites

- **Story 01 completed:** the backend serves `/api/v1` and CORS allows the frontend origin (`FRONTEND_ORIGIN`, default `http://localhost:5173`).
- **Story 02 completed** is *recommended* but not strictly blocking — the app shell renders without a database. The API client's health check needs Story 01 only.
- Node.js 24.x, as in Story 01.
- **Story 04 (localization) depends directly on this story.** Section 5 below deliberately leaves seams for it — read that section carefully and do not hard-code display strings.

---

## Story Goal

Stand up the frontend application skeleton:

1. A Vue 3 + TypeScript + Vite project that builds and typechecks cleanly.
2. Vue Router with a layout-based route structure and a lazy-loaded route.
3. Pinia for application state, with a typed store per domain concern.
4. A typed API client that speaks the backend's response envelope from Story 01.
5. A small set of reusable UI primitives (button, input, card, badge, spinner, empty state).
6. A **responsive** application shell — sidebar, top bar, content area — that collapses on mobile.

**Not in scope:** Arabic/English localization or RTL (Story 04 — but see section 5); component tests (Story 05); the README (Story 06); authentication or business screens.

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — this story covers implementation tasks **11–14**.
2. [`01-story-backend-foundation-15.md`](01-story-backend-foundation-15.md) — section 4 defines the error envelope (`success`, `error.code`, `error.message`, `error.details`, `correlationId`). The API client in section 4 below must parse exactly that shape.
3. **Precedent — the previous frontend, which was already Vue + TypeScript.** It lived at `week 4/frontend-vuejs/` and was removed in `bcd324b`. It is the closest available guide to house conventions. From the repository root (`D:/AZM Squad/Assignment Weeks`):
   - `git ls-tree -r --name-only f0776b4 -- "week 4/frontend-vuejs/src"` — the layout to reuse: `api/`, `assets/styles/`, `components/common/`, `components/layout/`, `router/`, `stores/`, `types/`, `views/`.
   - `git show "f0776b4:week 4/frontend-vuejs/src/api/client.ts"` — the previous API client.
   - `git show "f0776b4:week 4/frontend-vuejs/src/components/layout/AppLayout.vue"` and `AppSidebar.vue`, `AppTopbar.vue` — the shell this story rebuilds.
   - `git show "f0776b4:week 4/frontend-vuejs/src/components/common/StatusBadge.vue"` and `EmptyState.vue` — existing primitives worth carrying forward.
   - `git show "f0776b4:week 4/frontend-vuejs/src/stores/auth.store.ts"` — the established store naming convention (`*.store.ts`).

**Reuse the directory name `frontend-vuejs/`** and the file-naming conventions above (`*.api.ts`, `*.store.ts`, `*.view.vue` → previously `views/XxxView.vue`). Continuity with the previous tree matters more than a fresh scaffold's defaults.

---

## Implementation tasks

### 1 — Scaffold the project

From the project root (`week 4/`), scaffold with `create-vue`, then rename the output directory to `frontend-vuejs`:

```
npm create vue@latest
```

Select: **TypeScript yes**, **Router yes**, **Pinia yes**, **Vitest yes** (Story 05 configures it), **ESLint/Prettier yes**. Decline JSX, Nightwatch, Cypress, and Playwright.

Verified current versions at time of writing (August 2026) — let `create-vue` pin exact ranges, but expect at least:

| Package | Version |
|---|---|
| `vue` | 3.5.41 |
| `vite` | 8.2.2 |
| `pinia` | 4.0.3 |
| `vue-router` | 4.x |
| `vitest` | 4.1.11 |

> **Pinia 4 note:** Pinia's major version has moved past the many Pinia-2 tutorials online. Use the **setup-store** syntax (`defineStore('id', () => { … })`), which is the current idiom and gives better TypeScript inference than the options syntax.

**File: `frontend-vuejs/package.json`** — confirm the scripts include `dev`, `build`, `preview`, and `type-check`. The `build` script must run `vue-tsc` before `vite build` so a type error fails the build rather than shipping.

---

### 2 — Environment configuration and the dev proxy

**Create file: `frontend-vuejs/.env.example`** (committed) with:

```
VITE_API_BASE_URL=/api/v1
VITE_APP_TITLE=AZM Customer Support CRM
```

Only variables prefixed `VITE_` are exposed to client code. **Never** put a secret in this file — everything here ships to the browser.

**File: `frontend-vuejs/vite.config.ts`** — add a dev proxy so the browser sees a same-origin API and CORS never arises in development:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
  },
},
```

Add the `@` → `src` path alias in both `vite.config.ts` and `tsconfig.json` (create-vue usually does this; verify).

---

### 3 — Router

**File: `frontend-vuejs/src/router/index.ts`**

Use `createWebHistory`. Structure routes so the shell is a **layout route** wrapping children — this is what keeps the sidebar from re-mounting on every navigation:

```ts
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
];
```

- **Lazy-load every route component** with a dynamic import, so Vite code-splits per route.
- The catch-all uses `/:pathMatch(.*)*` — Vue Router 4 removed the bare `*` syntax; a plain `*` silently never matches.
- Add a `meta: { titleKey: string }` field to each route. Story 04 uses it for translated page titles — set it now even though this story renders it untranslated.
- Add an `afterEach` hook that sets `document.title`. Story 04 replaces its body with a translation lookup.

---

### 4 — State management and the API client

**Create file: `frontend-vuejs/src/api/client.ts`**

A thin `fetch` wrapper — no axios needed. It must:

- Read the base URL from `import.meta.env.VITE_API_BASE_URL`.
- Send `Content-Type: application/json` and `Accept: application/json`.
- Generate a `x-correlation-id` per request with `crypto.randomUUID()`, so a browser action can be traced to a backend log line from Story 01.
- Parse the Story 01 envelope: on a non-2xx response, read `error.code` and `error.message` and throw a typed `ApiError` carrying `status`, `code`, `message`, `details`, and `correlationId`.
- **Never** `JSON.parse` blindly — a proxy failure or a crashed backend returns HTML, and parsing it throws an opaque `Unexpected token <`. Check `response.headers.get('content-type')` includes `application/json` first, and raise a clear "backend unreachable" error otherwise.

**Create file: `frontend-vuejs/src/types/api.ts`** — mirror the backend envelope:

```ts
export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
  correlationId?: string;
}
```

**Create file: `frontend-vuejs/src/stores/app.store.ts`** — Pinia setup store holding UI-wide state:

```ts
export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true);
  const isLoading = ref(false);
  function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value; }
  return { sidebarOpen, isLoading, toggleSidebar };
});
```

Story 04 adds a `locale.store.ts` alongside it — do not put locale state in this store.

**File: `frontend-vuejs/src/main.ts`** — create the app, `use(createPinia())`, `use(router)`, mount. Story 04 inserts `use(i18n)` here.

---

### 5 — Reusable UI component foundation

**Create these under `frontend-vuejs/src/components/ui/`:**

| Component | Props | Notes |
|---|---|---|
| `BaseButton.vue` | `variant` (`primary`/`secondary`/`danger`/`ghost`), `size`, `disabled`, `loading` | Renders a real `<button>`; forwards `type`; shows a spinner and sets `aria-busy` when `loading` |
| `BaseInput.vue` | `modelValue`, `label`, `error`, `required` | `v-model` compatible via `defineModel()`; binds `<label for>` to the input `id` |
| `BaseCard.vue` | `title` | Slots: default, `header`, `footer` |
| `BaseBadge.vue` | `variant`, `label` | Carry forward the previous `StatusBadge.vue` semantics |
| `BaseSpinner.vue` | `size` | Pure CSS; must respect `prefers-reduced-motion` |
| `EmptyState.vue` | `title`, `description` | Slot for an action button |

**Rules that make Story 04 cheap — follow them exactly:**

- **No component contains a hard-coded display string.** Every user-visible string arrives via a prop or a slot. Story 04 then translates at the call site, not inside these files. A literal `"Save"` inside `BaseButton.vue` becomes a bug in Story 04.
- **Use CSS logical properties throughout** — `margin-inline-start`, `padding-inline-end`, `border-inline-start`, `inset-inline-start` — instead of `left`/`right`/`margin-left`/`padding-right`. When Story 04 sets `dir="rtl"`, logical properties flip automatically and physical ones do not. This single rule is the difference between Story 04 being a config change and being a stylesheet rewrite.
- Every component uses `<script setup lang="ts">` with typed props via `defineProps<…>()`.

**Create file: `frontend-vuejs/src/assets/styles/main.css`** — a small design-token layer as CSS custom properties on `:root`: colour palette, spacing scale, radii, font sizes, and a `--font-family-base`. Story 04 overrides `--font-family-base` for Arabic. Include a light CSS reset and set `box-sizing: border-box` globally.

---

### 6 — Responsive application shell

**Create file: `frontend-vuejs/src/components/layout/AppLayout.vue`** — CSS Grid: sidebar column plus a main column containing the top bar and a `<RouterView />`.

**Create file: `frontend-vuejs/src/components/layout/AppSidebar.vue`** — the brand mark plus `<RouterLink>` navigation. Use `router-link-active` for the current-route style. Navigation items come from a typed array with `{ name, titleKey, icon }`, so Story 04 can translate labels without touching the markup.

**Create file: `frontend-vuejs/src/components/layout/AppTopbar.vue`** — a sidebar toggle button, the page title, and a **right-hand slot reserved for Story 04's language switcher**. Leave the slot in place now.

**Responsive behaviour** — one breakpoint at `768px`:

- **Desktop (≥768px):** sidebar is a static grid column; the toggle collapses it to an icon rail.
- **Mobile (<768px):** sidebar leaves the grid flow and becomes an overlay driven by `appStore.sidebarOpen`, with a scrim behind it. It must start **closed** on mobile, and close automatically after a navigation (watch `route.fullPath`) — otherwise the user taps a link and stares at the still-open menu.
- The toggle button needs an `aria-label` and `aria-expanded`.
- Use `inset-inline-start` for the drawer's offscreen position, **not** `left` — see the logical-properties rule above.

**Create these views under `frontend-vuejs/src/views/`:** `DashboardView.vue` (a heading plus a few `BaseCard`s using the UI primitives — this is the visual proof the foundation works), `AboutView.vue` (renders the API health result via `client.ts`, proving frontend-to-backend connectivity), and `NotFoundView.vue`.

---

## Edge Cases & Failure Modes

- **Backend not running** — `fetch` rejects with a `TypeError` ("Failed to fetch"), which is *not* an HTTP error and has no status. `client.ts` must catch it separately and surface "backend unreachable" rather than letting an unhandled rejection reach the console.
- **Backend returns HTML** — a proxy misconfiguration or a crashed backend yields an HTML error page; blind `JSON.parse` throws `Unexpected token <`. Guarded by the content-type check in section 4.
- **`204 No Content`** — has no body; calling `response.json()` throws. Return `null` when the status is `204` or `Content-Length` is `0`.
- **Catch-all route never matches** — using `path: '*'` (Vue Router 3 syntax) silently fails on Router 4; unknown URLs render a blank page instead of `NotFoundView`. Must be `/:pathMatch(.*)*`.
- **Sidebar open on mobile after navigation** — the overlay covers the content the user just navigated to. Fixed by the `route.fullPath` watcher.
- **Sidebar state on resize** — resizing desktop → mobile with the sidebar open leaves a full-screen overlay. Either reset state on the breakpoint change or drive visibility from a `matchMedia` listener.
- **Physical CSS properties** — any `left`/`right`/`margin-left` that survives this story becomes a visible layout bug the moment Story 04 enables RTL. Grep for them before declaring the story done (see Verification step 9).
- **Hard-coded display strings** — any literal inside a `components/ui/` file cannot be translated in Story 04 without editing the component. Grep for them too.
- **`import.meta.env` missing a variable** — an undefined `VITE_API_BASE_URL` silently makes request URLs start with `undefined/`. Default it in `client.ts` (`?? '/api/v1'`) rather than trusting the environment.
- **`crypto.randomUUID` requires a secure context** — it exists on `localhost` and HTTPS, but is `undefined` on a plain-HTTP LAN address (e.g. testing from a phone at `http://192.168.x.x:5173`). Guard with a fallback before calling it.

---

## Test Plan

Component tests are written in **Story 05**; Vitest is merely installed here. Structure for testability, and record the tests Story 05 must add:

1. `src/components/ui/__tests__/BaseButton.spec.ts` — renders its slot; emits `click`; does **not** emit when `disabled`; shows the spinner and sets `aria-busy` when `loading`.
2. `src/components/ui/__tests__/BaseInput.spec.ts` — `v-model` round-trip; renders the error message when `error` is set; the label's `for` matches the input `id`.
3. `src/components/layout/__tests__/AppSidebar.spec.ts` — renders one link per nav item; applies the active class for the current route (mock the router).
4. `src/api/__tests__/client.spec.ts` — parses a success body; throws a typed `ApiError` carrying `code` on an error envelope; throws "backend unreachable" on a non-JSON content type; returns `null` on `204`.
5. `src/stores/__tests__/app.store.spec.ts` — `toggleSidebar()` flips `sidebarOpen` (uses `setActivePinia(createPinia())`).

Keep every component free of direct `fetch` calls so these tests need no network stubbing beyond `client.ts`.

---

## Verification Steps

Run from `frontend-vuejs/` unless noted.

1. **Install:** `npm install` completes cleanly.
2. **Frontend typechecks:** `npm run type-check` exits `0`.
3. **Frontend builds:** `npm run build` produces `dist/` with **per-route chunks** — confirming the lazy imports code-split.
4. **Frontend runs:** `npm run dev` serves on `http://localhost:5173`.
5. **Shell renders:** the dashboard shows the sidebar, top bar, and cards built from the UI primitives.
6. **Routing:** navigating to About and back does **not** re-mount the sidebar; an unknown URL such as `/nope` renders `NotFoundView`.
7. **Backend connectivity:** with the Story 01 backend running, the About view displays the health result. Stop the backend and confirm a clear "backend unreachable" message instead of a blank page or a console stack.
8. **Responsive:** in DevTools at 375px width the sidebar is a closed overlay; the toggle opens it with a scrim; tapping a link navigates **and** closes it. At 1280px it is a static column.
9. **RTL readiness:** `grep -rnE "(margin|padding|border)-(left|right)|[^-]\b(left|right):" src/` returns **no** layout-positioning matches. This is the gate for Story 04.
10. **No hard-coded strings:** manually review `src/components/ui/` — every user-visible string comes from a prop or slot.
11. **Accessibility:** the sidebar toggle is keyboard reachable and announces its state via `aria-expanded`.
12. **Regression:** the backend still passes every Story 01 and Story 02 verification; this story changes no backend file.

---

## Done Criteria

- [ ] `frontend-vuejs/` exists as a Vue 3 + TypeScript + Vite project; `npm run build` runs `vue-tsc` and exits `0`.
- [ ] The directory layout matches the previous implementation's conventions (`api/`, `components/common|layout|ui/`, `router/`, `stores/`, `types/`, `views/`).
- [ ] Vue Router uses a layout route with lazy-loaded children and a working `/:pathMatch(.*)*` catch-all; every route carries a `meta.titleKey`.
- [ ] Pinia is installed with `app.store.ts` written in setup-store syntax.
- [ ] `src/api/client.ts` parses the Story 01 envelope, sends a correlation id, and distinguishes HTTP errors, non-JSON responses, and network failures.
- [ ] The six UI primitives in section 5 exist, are typed with `<script setup lang="ts">`, and contain **no hard-coded display strings**.
- [ ] All layout CSS uses **logical properties**; verification step 9 returns no matches.
- [ ] Design tokens live in `assets/styles/main.css`, including an overridable `--font-family-base`.
- [ ] The app shell is responsive at the 768px breakpoint, and the mobile sidebar closes after navigation.
- [ ] `AppTopbar.vue` leaves a slot reserved for Story 04's language switcher.
- [ ] A dev proxy forwards `/api` to `http://localhost:3000`.
- [ ] `.env.example` is committed and contains no secrets.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 04.**
