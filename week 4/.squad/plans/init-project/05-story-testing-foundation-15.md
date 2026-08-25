# Story 05 — Testing foundation: backend unit/integration and frontend component tests (Story: 15)

## Prerequisites

- **Stories 01–04 completed.** This story writes the tests that those stories deferred; each of their Test Plan sections is the specification for the corresponding suite here. Read all four before starting:
  - [`01-story-backend-foundation-15.md`](01-story-backend-foundation-15.md) — Test Plan
  - [`02-story-database-foundation-15.md`](02-story-database-foundation-15.md) — Test Plan
  - [`03-story-frontend-foundation-15.md`](03-story-frontend-foundation-15.md) — Test Plan
  - [`04-story-localization-rtl-15.md`](04-story-localization-rtl-15.md) — Test Plan
- Story 01 exported the Express app from `src/app.ts` **without** calling `listen()`. If that is not true, fix it first — the integration suite depends on it.
- **Windows** is required for the database integration suite (Story 02's Windows Authentication constraint). Section 4 covers what happens elsewhere.

---

## Story Goal

Make the foundation verifiable by machine rather than by hand:

1. A backend test runner with unit and integration projects that can be run separately.
2. HTTP integration tests against the real Express app, with no port bound.
3. Database integration tests that prove the Windows Authentication connection and the Arabic round-trip.
4. A frontend component test runner with a DOM environment.
5. Component, store, composable, and translation-catalogue tests.
6. Coverage reporting and a single command that runs everything.

**Not in scope:** end-to-end browser tests (Playwright/Cypress); CI pipeline configuration (see section 4 for the constraint CI must respect); tests for business features that do not exist yet.

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — this story covers implementation tasks **17–18**.
2. `backend-nodejs/src/app.ts` and `src/server.ts` — confirm the app/server split before writing the first integration test.
3. `backend-nodejs/src/config/env.ts` — the zod schema; the test setup file must satisfy it or the process exits on import.
4. `backend-nodejs/src/config/data-source.ts` — `AppDataSource`; the database suite initializes and destroys it.
5. `frontend-vuejs/vite.config.ts` and `package.json` — `create-vue` already installed Vitest in Story 03; you are configuring it, not adding it.
6. `frontend-vuejs/src/i18n/index.ts` — components under test need the i18n plugin installed, or every `t()` call throws.
7. **Precedent:** the previous implementation had **no tests** — `git ls-tree -r --name-only f0776b4 -- "week 4"` shows no spec or test files. There is no prior pattern to match; the conventions below are the project's first.

---

## Implementation tasks

### 1 — Backend test runner

**Use Vitest** for both backend and frontend. One runner, one assertion API, one mental model — and it reads TypeScript through esbuild with no separate `ts-jest` transform step.

From `backend-nodejs/`, install as dev dependencies: `vitest`, `supertest`, `@types/supertest`, `@vitest/coverage-v8`, `cross-env`.

**Create file: `backend-nodejs/vitest.config.ts`**

Define two **projects** so the fast suite can run without a database:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.itest.ts'],
          fileParallelism: false,   // integration tests share one database
          testTimeout: 30_000,      // first ODBC connection is slow
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.itest.ts', 'src/database/migrations/**', 'src/server.ts'],
    },
  },
});
```

The naming split is deliberate: `*.spec.ts` needs nothing external; `*.itest.ts` needs SQL Server. `fileParallelism: false` on the integration project prevents two files from mutating the same tables concurrently — the classic source of tests that pass alone and fail together.

**Create file: `backend-nodejs/src/__tests__/setup.ts`** — set `NODE_ENV=test` and any variables `env.ts` requires, **before** any module import triggers the zod parse. Because `src/config/env.ts` calls `process.exit(1)` on invalid config, a missing variable here shows up as the test run vanishing with no output rather than as a failed assertion.

Add to `backend-nodejs/package.json`:

```json
"test": "vitest run --project unit",
"test:watch": "vitest --project unit",
"test:integration": "vitest run --project integration",
"test:all": "vitest run",
"test:coverage": "vitest run --project unit --coverage"
```

`npm test` runs only the fast suite — the one developers run constantly. Database tests are opt-in.

---

### 2 — Backend unit tests

Co-locate tests beside the code they cover, in a `__tests__` folder.

**Create file: `src/common/middleware/__tests__/errorHandler.spec.ts`**
- An `AppError` maps to its own `statusCode` and `error.code`.
- A plain `Error` becomes **500** with a generic message and **no** internal message in the body.
- With `NODE_ENV=production`, `error.stack` is **absent**; in development it is present. *This is the security-relevant assertion in the whole suite — an information-disclosure regression is invisible without it.*
- When `res.headersSent` is `true`, it delegates to `next(err)` and never calls `res.status()`.
- The response body always carries `correlationId`.

**Create file: `src/common/middleware/__tests__/validate.spec.ts`**
- A valid body passes and `req.body` is **replaced** with the parsed (coerced) value — assert a coerced type, e.g. a numeric string arriving as a `number`.
- An invalid body forwards a `ValidationError` with populated `details` and does **not** call the route handler.
- A schema on `query` works despite the getter-only property (the `Object.defineProperty` path from Story 01).

**Create file: `src/config/__tests__/env.spec.ts`**
- Valid input produces the typed object with defaults applied.
- Invalid input (e.g. `PORT=abc`) triggers exit. Stub `process.exit` and `console.error` with `vi.spyOn`, and use `vi.resetModules()` plus a dynamic `import()` so the module re-evaluates per case — a top-level-side-effect module is otherwise cached after the first import and every later case silently passes.

**Create file: `src/modules/health/__tests__/health.controller.spec.ts`** — returns `503` in the standard envelope when the DataSource is not initialized (mock `AppDataSource`; no live database).

---

### 3 — Backend HTTP integration tests

**Create file: `src/__tests__/app.itest.ts`** — Supertest against the imported app, binding no port:

```ts
import request from 'supertest';
import app from '../app';

it('returns 200 from the versioned health route', async () => {
  await request(app).get('/api/v1/health').expect(200);
});
```

Cover:
- `GET /health` and `GET /api/v1/health` both return `200`.
- An unknown route returns `404` in the standard envelope with `success: false`.
- The response carries an `x-correlation-id` header, and a supplied one is echoed back unchanged.
- `GET /api/docs.json` returns `200` in test/development, and the docs route is **absent** under `NODE_ENV=production`.
- A route that throws returns `500` with no stack in the body under production.
- Arabic sent in a JSON body round-trips byte-identically through `express.json()` — the HTTP-layer counterpart to the database test below.

---

### 4 — Backend database integration tests

**Create file: `src/database/__tests__/database.itest.ts`**

**Guard the whole file** — Windows Authentication cannot work off Windows:

```ts
const canRunWindowsAuth = process.platform === 'win32';
describe.skipIf(!canRunWindowsAuth)('database (Windows Authentication)', () => { … });
```

Use `beforeAll` to `AppDataSource.initialize()` and `afterAll` to `destroy()`. Wrap each test's writes in a transaction that is **rolled back** afterwards, so the suite leaves the developer's database as it found it.

Cover, per Story 02's Test Plan:
- `SELECT DB_NAME()` returns `CRM`, and `SUSER_SNAME()` returns a Windows account — proving Windows Auth rather than a SQL login.
- **The Arabic round-trip.** Insert a `Branch` with `NameAr = 'الفرع الرئيسي'`, read it back through a fresh query, and assert **strict equality**. This is the single highest-value test in the project: it is the exact defect that broke the previous implementation, whose `sqlcmd` layer stripped every non-ASCII byte.
- **No `varchar` columns.** Query `INFORMATION_SCHEMA.COLUMNS` and assert no user table has a `varchar`/`char` text column. This catches an Arabic-corrupting migration the moment it is added, long before anyone sees `?????` in the UI.
- Seed idempotency: running the seed twice leaves reference-table counts unchanged.

> **Tell whoever configures CI:** these tests **skip** on Linux runners rather than fail, so a green CI run does **not** mean the database layer was exercised. Either use a Windows runner, or point CI at a SQL-login connection. Record this explicitly in the Story 06 README — a silently-skipped suite that looks green is worse than one that fails.

---

### 5 — Frontend test runner

From `frontend-vuejs/`, install as dev dependencies: `@vue/test-utils`, `happy-dom`, `@vitest/coverage-v8`, `@pinia/testing`. Vitest itself came with `create-vue` in Story 03.

**Create file: `frontend-vuejs/vitest.config.ts`** (or extend the existing `vite.config.ts` via `mergeConfig`, which reuses the `@` alias rather than redefining it):

```ts
test: {
  environment: 'happy-dom',
  globals: true,
  include: ['src/**/*.spec.ts'],
  setupFiles: ['./src/__tests__/setup.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'html'] },
}
```

`happy-dom` over `jsdom`: markedly faster, and sufficient for component tests. Story 04's locale store touches `document.documentElement` and `localStorage`, both of which `happy-dom` provides.

**Create file: `frontend-vuejs/src/__tests__/setup.ts`** — a global test helper that mounts components with the i18n plugin and a fresh Pinia. Without the i18n plugin, every component containing `t()` throws an error that reads like a broken import rather than a missing plugin.

Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`.

---

### 6 — Frontend component, store, and catalogue tests

Write the suites specified by Stories 03 and 04:

**From Story 03:**
- `src/components/ui/__tests__/BaseButton.spec.ts` — renders its slot; emits `click`; does **not** emit when `disabled`; shows the spinner and sets `aria-busy` when `loading`.
- `src/components/ui/__tests__/BaseInput.spec.ts` — `v-model` round-trip; renders the error message; the label's `for` matches the input `id`.
- `src/components/layout/__tests__/AppSidebar.spec.ts` — one link per nav item; the active class applies for the current route (mock the router).
- `src/api/__tests__/client.spec.ts` — stub `globalThis.fetch` with `vi.fn()`: parses a success body; throws a typed `ApiError` carrying `code` on an error envelope; throws "backend unreachable" on a non-JSON content type; returns `null` on `204`; rejects cleanly when `fetch` itself rejects.
- `src/stores/__tests__/app.store.spec.ts` — `toggleSidebar()` flips `sidebarOpen`, using `setActivePinia(createPinia())` in `beforeEach`.

**From Story 04:**
- `src/i18n/__tests__/locale-parity.spec.ts` — **the highest-value frontend test.** Recursively flatten `en.json` and `ar.json`; assert identical key sets. A missing Arabic key is otherwise invisible until a user meets a half-English screen.
- `src/i18n/__tests__/catalogue.spec.ts` — no empty Arabic values; no Arabic value byte-identical to its English counterpart, with a short whitelist for genuinely shared strings such as "CRM".
- `src/stores/__tests__/locale.store.spec.ts` — `apply('ar')` sets `dir="rtl"` and `lang="ar"` on `documentElement` and writes to `localStorage`; `initialize()` rejects an invalid persisted value; a throwing `localStorage` does not break the store.
- `src/components/common/__tests__/LanguageSwitcher.spec.ts` — renders the target language label; clicking calls `apply` with the other locale.
- `src/composables/__tests__/useLocalizedName.spec.ts` — returns `nameAr` in Arabic; falls back to `nameEn` when `nameAr` is `null` or `''`; returns `''` when both are absent.
- `src/composables/__tests__/useFormat.spec.ts` — pins the `ar-SA` calendar decision from Story 04 section 6, so changing it later is deliberate rather than accidental.

---

## Edge Cases & Failure Modes

- **Test run vanishes with no output** — `src/config/env.ts` called `process.exit(1)` during import because the setup file did not provide a required variable. Always suspect this first; it presents as a silent exit, not a failure.
- **`env.spec.ts` passes vacuously** — module-level side effects run once and are cached. Without `vi.resetModules()` plus a dynamic `import()`, only the first case is real.
- **Integration tests pass alone, fail together** — concurrent files mutating shared tables. Prevented by `fileParallelism: false` on the integration project.
- **Integration tests leave rows behind** — a polluted developer database makes later runs fail unpredictably. Roll back each test's transaction in `afterEach`.
- **First database test times out** — the initial ODBC connection can exceed Vitest's default 5s timeout. Raised to 30s on the integration project.
- **Suite skipped silently in CI** — `describe.skipIf` reports green on Linux without testing anything. Called out in section 4 and documented in Story 06.
- **`t is not a function`** — a component was mounted without the i18n plugin. Fixed by the shared mount helper in section 5.
- **`getActivePinia()` was called with no active Pinia** — a store was used outside a component without `setActivePinia`. Do it in `beforeEach`.
- **Locale bleeding between tests** — `locale.store.ts` mutates the shared `i18n.global.locale` and `document.documentElement`. Reset both in `afterEach`, or one test's Arabic leaves the next asserting against RTL.
- **`localStorage` persisting across tests** — `happy-dom` shares it between files in the same worker. Clear it in `beforeEach`.
- **Arabic assertions and encoding** — a test file saved as CP1252 makes the round-trip test fail for a reason that looks like a driver bug. Save every test file as UTF-8, and compare with strict equality rather than a `contains` check.
- **Coverage counting migrations** — generated migration files would dominate the report. Excluded in the config.

---

## Test Plan

This story *is* the test plan for Stories 01–04. The self-check that the harness itself works:

1. **Deliberate failure:** temporarily break one assertion and confirm the suite reports a failure with a useful diff and a non-zero exit code. Revert.
2. **Guard verification:** temporarily set `process.platform` to a non-Windows value and confirm the database suite **skips** rather than errors.
3. **Isolation:** run `npm run test:integration` twice in a row and confirm identical results — proving rollback and idempotency.
4. **No cross-test leakage:** run the frontend suite with `--sequence.shuffle` and confirm it still passes, proving no test depends on another's locale or `localStorage` state.

---

## Verification Steps

1. **Backend unit tests:** from `backend-nodejs/`, `npm test` passes and exits `0` **without** SQL Server running — proving true unit isolation.
2. **Backend integration tests:** with SQL Server running and Story 02 migrated and seeded, `npm run test:integration` passes on Windows.
3. **Arabic proof:** confirm the round-trip test in `database.itest.ts` is reported as **passed**, not skipped.
4. **Backend coverage:** `npm run test:coverage` produces a report; the middleware and config modules are meaningfully covered.
5. **Frontend tests:** from `frontend-vuejs/`, `npm test` passes and exits `0`.
6. **Locale parity:** temporarily delete a key from `ar.json` and confirm `locale-parity.spec.ts` **fails**. Restore it and confirm it passes. *A parity test that cannot fail is worthless — verify this explicitly.*
7. **Frontend coverage:** `npm run test:coverage` produces a report covering the UI primitives, stores, and composables.
8. **Shuffled run:** `npx vitest run --sequence.shuffle` passes in both projects.
9. **Backend builds:** `npm run build` still exits `0` — test files must not leak into `dist/` (they are excluded by `tsconfig.json`'s `include`, but confirm).
10. **Frontend builds:** `npm run build` still exits `0`.
11. **Regression:** every Story 01–04 manual check still passes; this story adds tests and configuration only, and changes no application behaviour.

---

## Done Criteria

- [ ] Vitest is configured in both `backend-nodejs/` and `frontend-vuejs/`.
- [ ] The backend separates `*.spec.ts` (unit) from `*.itest.ts` (integration) as distinct Vitest projects.
- [ ] `npm test` in `backend-nodejs/` passes with **no** database available.
- [ ] Integration tests run against the imported Express app via Supertest, binding no port.
- [ ] `fileParallelism: false` and a raised timeout are set on the integration project.
- [ ] Database tests are guarded by `process.platform === 'win32'` and roll back their writes.
- [ ] The Arabic round-trip test and the "no `varchar` columns" test both exist and pass on Windows.
- [ ] The error-handler test asserts no stack is exposed under `NODE_ENV=production`.
- [ ] The frontend runs component tests under `happy-dom` with a shared mount helper providing i18n and Pinia.
- [ ] All component, store, composable, and API-client tests from Stories 03 and 04 exist and pass.
- [ ] `locale-parity.spec.ts` exists and has been **proven to fail** when a key is missing.
- [ ] Coverage reporting is configured in both projects, excluding migrations and entrypoints.
- [ ] Both suites pass under `--sequence.shuffle`.
- [ ] The CI limitation from section 4 is written down for Story 06's README.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 06.**
