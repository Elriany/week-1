# Story 06 — README, environment templates, and clean build verification (Story: 15)

## Prerequisites

- **Stories 01–05 completed and verified.** This story documents what they built and proves the whole thing starts from a clean checkout. It is the acceptance gate for work item 15 as a whole.
- Access to a clean environment — or at least the willingness to delete `node_modules/`, `dist/`, and the `CRM` database — because section 5 is worthless if run against an already-warm machine.

---

## Story Goal

Turn the foundation into something another developer can pick up unaided:

1. A root `README.md` covering architecture, prerequisites, setup, and daily commands.
2. Complete, committed `.env.example` templates for both applications.
3. A documented, ordered first-run sequence that works from a fresh clone.
4. A troubleshooting section covering the failure modes Stories 01–05 identified.
5. A verified clean build and run of both applications.

**Not in scope:** CI pipeline configuration, deployment or hosting documentation, and API endpoint reference beyond pointing at Swagger.

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — this story covers implementation tasks **19–20**, and its **Acceptance criteria** is the checklist section 5 verifies.
2. **All five preceding plans** — the README's setup and troubleshooting sections are assembled from their Verification Steps and Edge Cases. Do not invent content; source it from:
   - [`01-story-backend-foundation-15.md`](01-story-backend-foundation-15.md) — scripts, env vars, `/api/docs`
   - [`02-story-database-foundation-15.md`](02-story-database-foundation-15.md) — ODBC prerequisite, `db:create` → `migration:run` → `db:seed` ordering, Windows-only constraint
   - [`03-story-frontend-foundation-15.md`](03-story-frontend-foundation-15.md) — dev proxy, `VITE_` variables
   - [`04-story-localization-rtl-15.md`](04-story-localization-rtl-15.md) — locale conventions
   - [`05-story-testing-foundation-15.md`](05-story-testing-foundation-15.md) — test commands and the CI skip warning
3. `backend-nodejs/package.json` and `frontend-vuejs/package.json` — **read the actual `scripts` blocks** and document those exact names. A README listing a script that does not exist is worse than no README.
4. `backend-nodejs/src/config/env.ts` — the zod schema is the **authoritative** list of backend environment variables. Every key in it must appear in `.env.example`.
5. **Precedent:** `git show "f0776b4:README.md"` and `git show "f0776b4:week 4/backend-nodejs/.env.example"` — the previous README's structure and the established variable names.

---

## Implementation tasks

### 1 — Environment templates

**Create file: `backend-nodejs/.env.example`** — every key from the `env.ts` zod schema, with safe development defaults and a comment per group:

```dotenv
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# CORS — the Vite dev server origin
FRONTEND_ORIGIN=http://localhost:5173

# Database — SQL Server, Windows Authentication
# DB_SERVER is "." for the local default instance, or ".\SQLEXPRESS" for a named instance.
DB_SERVER=.
DB_DATABASE=CRM
DB_TRUSTED_CONNECTION=true
DB_TRUST_SERVER_CERTIFICATE=true
DB_ENCRYPT=false
# Must match an ODBC driver installed on this machine, at the same bitness as Node.
DB_ODBC_DRIVER=ODBC Driver 18 for SQL Server
```

**Create file: `frontend-vuejs/.env.example`** (if Story 03 did not already):

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_APP_TITLE=AZM Customer Support CRM
```

**Rules:**
- **No secrets, in either file.** There are none at this stage — no JWT secret, no SQL password — precisely because Windows Authentication carries no credentials. Keep it that way; when authentication arrives, the template gets a placeholder, never a real value.
- Everything in the frontend template ships to the browser. Say so in a comment.
- Confirm `.env` is git-ignored in both projects while `.env.example` is **committed**. Verify with `git check-ignore -v backend-nodejs/.env`.
- Cross-check the backend template against the zod schema key by key. A key in the schema but missing here means a fresh clone fails to boot with a message the newcomer cannot act on.

---

### 2 — Root README

**Create file: `README.md`** at the project root (`week 4/`), with these sections in order.

**Title and one-paragraph overview** — AZM Customer Support CRM; the technical foundation for a multi-branch, multi-department, bilingual (Arabic/English) support system.

**Tech stack** — a table of the actual installed versions. Read them from the two `package.json` files rather than restating the plans:

| Layer | Technology |
|---|---|
| Runtime | Node.js 24.x LTS |
| Backend | Express + TypeScript |
| Database | SQL Server (database `CRM`, Windows Authentication) |
| ORM / migrations | TypeORM with `mssql` + `msnodesqlv8` |
| Frontend | Vue 3 + TypeScript + Vite |
| State / routing | Pinia, Vue Router |
| i18n | vue-i18n (Arabic/English, RTL/LTR) |
| Testing | Vitest, Supertest, Vue Test Utils |

**Prerequisites** — and be blunt about the platform:

> **Windows is required for local development.** The database layer uses SQL Server **Windows Authentication**, which depends on the `msnodesqlv8` native driver and only works when Node.js runs on Windows. It does not work on macOS, Linux, or inside a Linux container.

List: Node.js 24.x LTS; SQL Server (any recent edition, including Express) reachable at `.`; **Microsoft ODBC Driver 18 for SQL Server**, matching Node's architecture; and a note to verify with `node -p "process.arch"` against the installed driver's bitness.

**Project structure** — a short annotated tree of `backend-nodejs/src/` and `frontend-vuejs/src/`, explaining the *purpose* of each top-level folder (`modules/` is per-feature, `common/` is cross-cutting, `database/` holds migrations and seed). One line each; this is orientation, not an inventory.

**Getting started** — the **ordered** first-run sequence. The ordering is the single most valuable thing in this document, because every step fails confusingly when run out of order:

```bash
# 1. Backend dependencies
cd backend-nodejs
npm install
cp .env.example .env          # adjust DB_SERVER / DB_ODBC_DRIVER if needed

# 2. Database — this exact order
npm run db:create             # creates the CRM database (Arabic_CI_AS collation)
npm run migration:run         # applies the schema
npm run db:seed               # reference data + development demo data

# 3. Run the backend  ->  http://localhost:3000
npm run dev

# 4. Frontend, in a second terminal  ->  http://localhost:5173
cd ../frontend-vuejs
npm install
cp .env.example .env
npm run dev
```

State explicitly that `db:create` must precede `migration:run` — TypeORM cannot create the database it connects to — and that both servers run simultaneously in separate terminals.

**Available scripts** — two tables, backend and frontend, transcribed from the real `package.json` files: what each script does and when to use it.

**Key URLs** — API `http://localhost:3000/api/v1`, health `/api/v1/health` and `/api/v1/health/db`, Swagger UI `http://localhost:3000/api/docs`, OpenAPI JSON `/api/docs.json`, frontend `http://localhost:5173`.

**Architecture notes** — brief, and only where a reader would otherwise be puzzled:
- API versioning: everything under `/api/v1`; new versions are added, never edited in place.
- Error envelope: the single shape from Story 01, with an example body.
- Migrations are the **only** path for schema change; `synchronize` is permanently `false`.
- Localization: every UI string comes from `src/i18n/locales/`; `*En`/`*Ar` database columns resolve through `useLocalizedName`.
- **Use CSS logical properties, never `left`/`right`** — the rule that keeps RTL working. Put this where a new contributor will actually meet it.

**Testing** — the commands from Story 05, plus this warning verbatim:

> Database integration tests **skip** automatically when not running on Windows. A green run on a non-Windows machine or CI runner does **not** mean the database layer was tested.

**Troubleshooting** — a symptom-to-cause table, sourced from the Edge Cases of Stories 01–05. At minimum:

| Symptom | Cause and fix |
|---|---|
| `The specified module could not be found` on start | ODBC driver missing, or its bitness differs from Node's. Install Microsoft ODBC Driver 18 matching `node -p "process.arch"`. |
| `Login failed for user ''` | The driver fell back to `tedious`. Confirm `driver` is passed at the **top level** of the DataSource options, not inside `extra`. |
| `Cannot open database "CRM"` | `npm run db:create` was not run before `migration:run`. |
| Server exits immediately, printing variable names | Invalid `.env`; `env.ts` fails fast by design. Fix the listed keys. |
| Arabic shows as `?????` | A `varchar` column reached a migration. All text columns must be `nvarchar`. |
| Arabic shows as blanks or mojibake | A source file was not saved as UTF-8. |
| UI half English, half Arabic | A key is missing from `ar.json`. Run the frontend tests — `locale-parity.spec.ts` names it. |
| Layout does not mirror in Arabic | Physical CSS (`left`/`right`) crept in. Grep `src/` and convert to logical properties. |
| Frontend shows "backend unreachable" | The backend is not running, or the Vite proxy target does not match its port. |
| `EADDRINUSE` on start | Port 3000 or 5173 is occupied. Change `PORT` / the Vite `server.port`. |

**Known limitations** — honest and short: Windows-only local development; no authentication yet; API error messages are English-only (the Story 04 follow-up); no CI configured.

---

### 3 — Backend and frontend READMEs

Keep these **short** and non-duplicating — a stale second copy of the setup steps is a liability. Each is a pointer to the root README plus the folder-specific conventions:

- **Create file: `backend-nodejs/README.md`** — module layout convention (`modules/<feature>/<feature>.{controller,routes,entity}.ts`), how to add a route to `routes/v1.ts`, and how to add a migration.
- **Create file: `frontend-vuejs/README.md`** — component conventions (`components/ui/` primitives take all display strings as props/slots), the logical-properties rule, and how to add a translation key to **both** catalogues.

---

### 4 — Repository hygiene

- Confirm the root `.gitignore` and both project `.gitignore` files cover `node_modules/`, `dist/`, `.env`, `*.log`, and coverage output.
- **Do not** modify the squad-kit managed block in the root `.gitignore` (the lines between `# Managed by squad-kit` and `# End squad-kit block`).
- Verify no `.env`, `node_modules/`, `dist/`, or coverage directory is tracked: `git status --porcelain` must be clean after a build and test run. If a build artifact appears, fix the `.gitignore` rather than deleting the file by hand.
- Confirm no `package-lock.json` was accidentally ignored — both **must** be committed for reproducible installs.

---

### 5 — Clean build and run verification

This is the acceptance gate for the entire work item. **Run it in a genuinely clean state** — otherwise it proves nothing.

```bash
# From the project root
rm -rf backend-nodejs/node_modules backend-nodejs/dist
rm -rf frontend-vuejs/node_modules frontend-vuejs/dist
```

Additionally drop the `CRM` database in SSMS, so the database bootstrap is exercised from nothing.

Then walk the README's own **Getting started** section verbatim, typing only what it says. **The point is to catch a step the README omits** — if you find yourself relying on knowledge that is not written down, that is a documentation defect. Fix the README and start over.

---

## Edge Cases & Failure Modes

- **README documents a script that does not exist** — the most common documentation defect. Prevented by transcribing from the real `package.json` files (Context item 3) and by section 5's verbatim walkthrough.
- **`.env.example` drifts from the zod schema** — a fresh clone dies on a missing key. Prevented by the key-by-key cross-check in section 1; re-check whenever a variable is added.
- **`cp` does not exist in PowerShell** — it is aliased to `Copy-Item`, so `cp .env.example .env` works in PowerShell, but not in `cmd.exe` (`copy .env.example .env`). Since the project is Windows-only, note both forms.
- **Verification run against a warm machine** — a cached `node_modules/` or an existing `CRM` database hides exactly the failures this step exists to catch. Section 5's deletions are mandatory, not optional.
- **A real secret committed to `.env.example`** — permanent in git history. There are no secrets today; the rule matters when authentication lands.
- **`.env` accidentally tracked** — verify with `git check-ignore -v`, not by eye.
- **Troubleshooting entries that were never reproduced** — every row in the table must correspond to a failure mode identified in Stories 01–05. Do not add speculative entries.
- **Documentation implying cross-platform support** — a developer on macOS will follow the setup and fail at `npm run db:create` with an opaque native-module error. The Windows-only constraint must appear in **Prerequisites**, not buried in Troubleshooting.

---

## Test Plan

No automated tests are added — this story's verification is the clean-run procedure. Confirm the existing suites still pass as part of it:

1. `cd backend-nodejs && npm test` — unit suite passes with no database.
2. `cd backend-nodejs && npm run test:integration` — passes on Windows after the database steps.
3. `cd frontend-vuejs && npm test` — component suite passes.
4. **Documentation self-test:** have someone who did not write the code follow the README on a clean machine. Every question they need to ask is a README defect. If nobody else is available, the clean-state walkthrough in section 5 is the substitute.

---

## Verification Steps

1. **Clean state:** `node_modules/` and `dist/` deleted in both projects; the `CRM` database dropped.
2. **Backend installs:** `cd backend-nodejs && npm install` succeeds from the committed lockfile.
3. **Env template works:** copy `.env.example` to `.env` **unmodified** and confirm the defaults work on a standard local SQL Server. Any edit required must be called out in the README.
4. **Database bootstraps:** `npm run db:create`, `npm run migration:run`, `npm run db:seed` each succeed in that order, following only the README.
5. **Backend builds:** `npm run build` exits `0` and produces `dist/server.js`.
6. **Backend runs:** `npm start` serves; `/api/v1/health` returns `200`; `/api/v1/health/db` reports database `CRM` and a Windows login name.
7. **Swagger:** `http://localhost:3000/api/docs` renders.
8. **Frontend installs and builds:** `npm install` then `npm run build` exits `0` (running `vue-tsc` first).
9. **Frontend runs:** `npm run dev` serves at `:5173`; the shell renders and reaches the backend through the proxy.
10. **Bilingual proof:** switch to Arabic — the UI translates, the layout mirrors, and a seeded ticket status renders as "جديد".
11. **All tests pass:** the three commands from the Test Plan.
12. **Repository clean:** `git status --porcelain` shows no build artifacts, no `node_modules/`, and no `.env`.
13. **Acceptance criteria walkthrough:** re-read the intake's acceptance criteria line by line and confirm each clause — Node LTS + TypeScript + REST, Vue + TypeScript, SQL Server `CRM` on `.` with Windows Authentication, configuration, migrations, seed data, Swagger, validation, logging, testing foundation, Arabic/English and RTL/LTR readiness, modular architecture, multi-branch and multi-department readiness.
14. **Regression:** every verification step from Stories 01–05 still passes.

---

## Done Criteria

- [ ] `backend-nodejs/.env.example` contains **every** key from the `env.ts` zod schema, with comments and no secrets.
- [ ] `frontend-vuejs/.env.example` is committed and notes that `VITE_` variables ship to the browser.
- [ ] `.env` is git-ignored in both projects, verified with `git check-ignore`; both lockfiles are committed.
- [ ] The root `README.md` contains all sections from section 2, with scripts transcribed from the real `package.json` files.
- [ ] The **Windows-only** constraint appears in Prerequisites, with the ODBC driver and bitness requirement.
- [ ] The ordered first-run sequence is documented, stating that `db:create` precedes `migration:run`.
- [ ] The troubleshooting table covers every symptom listed in section 2, each traceable to a Story 01–05 edge case.
- [ ] The testing section carries the warning that database tests **skip** off Windows.
- [ ] Short, non-duplicating `README.md` files exist in `backend-nodejs/` and `frontend-vuejs/`.
- [ ] The squad-kit managed `.gitignore` block is unmodified.
- [ ] A clean-state run of the README's own instructions succeeds end to end with no undocumented step.
- [ ] Both applications build and run; all three test suites pass.
- [ ] Every clause of the intake's acceptance criteria is confirmed satisfied.

**This completes work item 15 — US01 Project Bootstrap & Technical Foundation. Report to the user with the results of the clean-run verification.**
