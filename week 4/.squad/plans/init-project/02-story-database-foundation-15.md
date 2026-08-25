# Story 02 — Database foundation: SQL Server (Windows Authentication), TypeORM migrations, CRM schema and seed (Story: 15)

## Prerequisites

- **Story 01 completed:** `backend-nodejs/` builds, `src/config/env.ts` validates configuration with zod, and `tsconfig.json` already has `experimentalDecorators` and `emitDecoratorMetadata` enabled. This story adds no tsconfig changes.
- **This story runs on Windows only.** Windows Authentication requires the Node process to run on Windows — it cannot work on a Linux CI agent, macOS, or inside a Linux container. See **Edge Cases** for the consequence on CI.
- Local prerequisites, verified before writing code:
  - SQL Server reachable at server `.` (local default instance) with the developer's Windows account holding rights to create a database.
  - **Microsoft ODBC Driver 17 or 18 for SQL Server** installed, matching the **architecture of the Node.js runtime** (64-bit Node needs the 64-bit ODBC driver). `msnodesqlv8` binds to this native driver; without it, connection fails at load time.
  - Confirm with: `sqlcmd -S . -Q "SELECT @@VERSION"`.

---

## Story Goal

Give the backend a real, typed, Arabic-safe data layer:

1. A TypeORM `DataSource` connecting to SQL Server database **`CRM`** on server **`.`** using **Windows Authentication**.
2. A migration workflow (generate, run, revert) that is the **only** way schema changes reach the database.
3. An initial CRM schema foundation that is **multi-branch** and **multi-department** ready, with bilingual (Arabic/English) name columns.
4. An idempotent seed mechanism for reference data and a minimal demo dataset.
5. A `GET /api/v1/health/db` endpoint proving the connection from a running server.

**Not in scope:** business endpoints, repositories, or services for these entities; authentication; any frontend work. This story delivers the schema and the connection, nothing more.

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — this story covers implementation tasks **7–10**. The **Acceptance criteria** fixes three non-negotiables: database **`CRM`**, server **`.`**, **Windows Authentication**, plus "multi-branch and multi-department readiness".
2. [`01-story-backend-foundation-15.md`](01-story-backend-foundation-15.md) — section 3 defines `src/config/env.ts`. You **extend** that existing zod schema; do not create a second config module.
3. `backend-nodejs/src/config/env.ts` and `backend-nodejs/src/app.ts` — read both before editing. You add `DB_*` keys to the schema and one route to the app.
4. **Precedent — the previous implementation's database layer.** Read it specifically to understand what **not** to repeat. From the repository root (`D:/AZM Squad/Assignment Weeks`):
   - `git show "f0776b4:week 4/backend-nodejs/src/config/dbQuery.js"` — the previous data layer.
   - `git show "f0776b4:week 4/backend-nodejs/.env.example"` — the previous `DB_*` variable names (`DB_SERVER`, `DB_DATABASE`, `DB_TRUSTED_CONNECTION`, `DB_TRUST_SERVER_CERTIFICATE`, `DB_ENCRYPT`). **Reuse these names.**
   - `git ls-tree -r --name-only f0776b4 -- "week 4/backend-nodejs/database"` — the previous migration file layout and numbering convention.

> ### Read this before writing any query
>
> The previous implementation did **not** use a SQL Server driver. `dbQuery.js` shelled out to the `sqlcmd` CLI with `execSync`, wrote a temp `.sql` file per query, and built SQL by **string-substituting parameters directly into the statement**. It had two defects this story must not reproduce:
>
> 1. **It corrupted Arabic.** Its `cleanOutput()` ran `text.replace(/[\u0080-\u00FF]/g, ' ')` over every result. Any non-ASCII byte was replaced with a space. That is fatal for the Arabic/English requirement in this same work item.
> 2. **It was injectable and blocking.** Parameters were interpolated into SQL as strings, and `execSync` blocked the event loop on every query.
>
> This story replaces that approach entirely with a real driver and parameterized queries. **Never** reintroduce `sqlcmd`, `execSync`, or string-interpolated SQL.

---

## Product rules (from story)

| Concern | Previous behaviour (commit `f0776b4`) | Required behaviour (this story) |
|---|---|---|
| Driver | `sqlcmd` CLI via `execSync` | `mssql` + `msnodesqlv8` through TypeORM |
| Parameters | String-interpolated into SQL | Parameterized via TypeORM |
| Non-ASCII text | Stripped by `cleanOutput()` | Preserved end-to-end; `NVARCHAR` columns |
| Schema changes | Hand-run `.sql` files via `setup.js` | TypeORM migrations, tracked in a migrations table |
| Database | `ApprovalWorkflowSystem` | **`CRM`** |

---

## Implementation tasks

### 1 — Install the driver stack

From `backend-nodejs/`:

- Runtime dependencies: `typeorm`, `mssql`, `reflect-metadata`
- **Windows-only dependency:** `msnodesqlv8`

Declare `msnodesqlv8` under **`optionalDependencies`**, not `dependencies`:

```json
"optionalDependencies": {
  "msnodesqlv8": "^5.2.3"
}
```

**Why optional:** `msnodesqlv8` is a native module that only builds and loads on Windows. Putting it in `dependencies` makes `npm ci` fail outright on a Linux CI agent. The previous implementation already used `optionalDependencies` for it — keep that decision.

Add `import 'reflect-metadata';` as the **very first line** of `src/server.ts`, before any other import. TypeORM decorators read metadata at class-definition time; importing it later silently produces entities with no column metadata.

---

### 2 — Extend the environment schema

**File: `backend-nodejs/src/config/env.ts`**

Add these keys to the existing zod schema from Story 01. Do not create a new file.

```ts
DB_SERVER: z.string().min(1).default('.'),
DB_DATABASE: z.string().min(1).default('CRM'),
DB_TRUSTED_CONNECTION: z.coerce.boolean().default(true),
DB_TRUST_SERVER_CERTIFICATE: z.coerce.boolean().default(true),
DB_ENCRYPT: z.coerce.boolean().default(false),
DB_ODBC_DRIVER: z.string().default('ODBC Driver 18 for SQL Server'),
```

> **Caution on `z.coerce.boolean()`:** it follows JavaScript truthiness, so the **string** `"false"` coerces to `true`. If any `DB_*` flag must be switchable to false from `.env`, parse it explicitly instead:
> `z.enum(['true','false']).transform(v => v === 'true')`. Use that form for all three boolean flags above.

---

### 3 — The DataSource: Windows Authentication

**Create file: `backend-nodejs/src/config/data-source.ts`**

This is the single riskiest configuration in the feature. Get it exactly right.

**Background — why the obvious approach fails.** TypeORM's default SQL Server path uses the `tedious` driver, and **tedious does not support Windows Authentication (SSPI)**. The `msnodesqlv8` driver does. TypeORM has no `useMsnodesqlv8` flag, and its GitHub issue #9334 (requesting msnodesqlv8 support) was closed as *not planned* — but that issue's failing snippet placed `driver` inside `extra`, which TypeORM ignores.

**TypeORM does support this, via a top-level `driver` option.** In `src/driver/sqlserver/SqlServerDriver.ts`, dependencies load as:

```ts
const mssql = this.options.driver ?? PlatformTools.load("mssql")
```

and `SqlServerDataSourceOptions.ts` declares `readonly driver?: any` ("The driver object"). The same file's `requestTimeout` doc comment explicitly references msnodesqlv8 behaviour, confirming the combination is anticipated.

So `driver` goes at the **top level** of the options object — **not** inside `extra`:

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as msnodesqlv8 from 'mssql/msnodesqlv8';
import { env } from './env';

const connectionString = [
  `Driver={${env.DB_ODBC_DRIVER}}`,
  `Server=${env.DB_SERVER}`,
  `Database=${env.DB_DATABASE}`,
  'Trusted_Connection=yes',
  `TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no'}`,
].join(';') + ';';

export const AppDataSource = new DataSource({
  type: 'mssql',
  driver: msnodesqlv8,          // TOP LEVEL — inside `extra` it is ignored
  database: env.DB_DATABASE,
  synchronize: false,           // NEVER true — migrations are the only schema path
  logging: env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  entities: [__dirname + '/../modules/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  migrationsTableName: '__migrations',
  extra: { connectionString },
});
```

**Three details that decide whether this works:**

- **`driver` must be top level.** This is the whole fix for issue #9334.
- **`extra.connectionString`** is the reliable way to pass `Trusted_Connection` to msnodesqlv8. In `SqlServerDriver.createPool`, `options.extra` is merged **last** via `Object.assign`, so it lands at the top level of the mssql config where msnodesqlv8 reads it. Do **not** instead put an `options: { trustedConnection: true }` object inside `extra` — because `extra` is merged last, that would *replace* TypeORM's whole `options` key and discard the isolation-level settings it puts there.
- **`Trusted_Connection=yes`.** The literal `yes` is the value the ODBC driver recognizes; `True` is not reliably accepted.

**`synchronize` must stay `false`.** With `true`, TypeORM rewrites the schema from entities at every boot — silent data loss, and it makes the migration workflow below meaningless.

**Create file: `backend-nodejs/src/config/data-source.cli.ts`** exporting the same `AppDataSource` as a **default** export. The TypeORM CLI requires a default-exported DataSource; the app imports the named one.

---

### 4 — Migration workflow

Add to `backend-nodejs/package.json` scripts (`typeorm` runs through `tsx` so migrations are authored in TypeScript):

```json
"typeorm": "typeorm-ts-node-commonjs -d src/config/data-source.cli.ts",
"db:create": "tsx src/database/create-database.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert",
"db:seed": "tsx src/database/seed.ts"
```

**Create file: `backend-nodejs/src/database/create-database.ts`**

TypeORM cannot create the database it is told to connect to. This script connects to **`master`** with the same Windows Authentication settings and runs:

```sql
IF DB_ID(N'CRM') IS NULL
  CREATE DATABASE [CRM] COLLATE Arabic_CI_AS;
```

**`COLLATE Arabic_CI_AS`** — case-insensitive, accent-sensitive Arabic collation, so Arabic sorting and comparison behave correctly. Combined with `NVARCHAR` columns this makes the database Arabic-correct by construction. The script must be **idempotent**: running it twice is a no-op.

Migrations live in `backend-nodejs/src/database/migrations/`, named `<timestamp>-<Description>.ts` (TypeORM's own convention — it orders by the leading timestamp). Every migration implements both `up()` and a genuine `down()`.

---

### 5 — Initial CRM schema foundation

Create one entity file per table under `src/modules/<module>/<name>.entity.ts`, then generate a single migration from them.

The acceptance criteria demands **multi-branch and multi-department readiness**, so `Branch` is a first-class table from day one and every scopeable record carries a `BranchId` — retrofitting that later means a data migration across every table.

| Table | Module | Purpose | Key columns |
|---|---|---|---|
| `Branches` | `branches` | Physical/organizational branch | `Id`, `Code` (unique), `NameEn`, `NameAr`, `IsActive` |
| `Departments` | `departments` | Department **within** a branch | `Id`, `BranchId` → `Branches`, `Code`, `NameEn`, `NameAr`, `IsActive` |
| `Roles` | `users` | RBAC role | `Id`, `Code` (unique), `NameEn`, `NameAr` |
| `Users` | `users` | Support agent / manager | `Id`, `BranchId`, `DepartmentId`, `RoleId`, `Email` (unique), `FullNameEn`, `FullNameAr`, `IsActive` |
| `Customers` | `customers` | CRM customer | `Id`, `BranchId`, `Code` (unique), `FullNameEn`, `FullNameAr`, `Email`, `Phone`, `PreferredLanguage` |
| `Tickets` | `tickets` | Support ticket | `Id`, `TicketNumber` (unique), `BranchId`, `DepartmentId`, `CustomerId`, `AssignedUserId` (nullable), `StatusId`, `PriorityId`, `Subject`, `Description` |
| `TicketStatuses` | `tickets` | Lookup | `Id`, `Code` (unique), `NameEn`, `NameAr`, `SortOrder` |
| `TicketPriorities` | `tickets` | Lookup | `Id`, `Code` (unique), `NameEn`, `NameAr`, `SortOrder` |
| `TicketComments` | `tickets` | Thread entry | `Id`, `TicketId`, `AuthorUserId`, `Body`, `IsInternal` |

**Column conventions — apply to every entity without exception:**

- **Every human-readable text column is `nvarchar`, never `varchar`.** `varchar` cannot store Arabic and silently writes `?` characters. In TypeORM: `@Column({ type: 'nvarchar', length: 200 })`.
- **Bilingual pairs.** Any name shown in the UI has both `*En` and `*Ar` columns. Story 04 consumes these.
- **Primary keys** are `@PrimaryGeneratedColumn('uuid')`, giving SQL Server `uniqueidentifier`. Prefer this over identity integers so records can be created client-side and merged across branches.
- **Audit columns** on every table via a shared abstract base class — **create file: `backend-nodejs/src/common/entities/BaseEntity.ts`** with `CreatedAt` (`@CreateDateColumn`), `UpdatedAt` (`@UpdateDateColumn`), and a nullable `DeletedAt` (`@DeleteDateColumn`) for soft deletes. Extend it from every entity.
- **Foreign keys** use `onDelete: 'NO ACTION'`. SQL Server rejects multiple cascade paths to the same table; because `Tickets` references both `Branches` and `Departments` (and `Departments` also references `Branches`), cascading deletes throws *"may cause cycles or multiple cascade paths"* at migration time.
- **Indexes:** on every FK column, on `Tickets.TicketNumber` (unique), on `Users.Email` (unique), and a composite index on `(BranchId, DepartmentId)` in `Tickets` — the query shape every future list screen will use.

Generate the migration once the entities compile:

```
npm run migration:generate -- src/database/migrations/InitialCrmSchema
```

**Read the generated SQL before running it.** Confirm all text columns emitted as `nvarchar`, and that no FK emitted `ON DELETE CASCADE`.

---

### 6 — Seed mechanism

**Create file: `backend-nodejs/src/database/seed.ts`**

Two tiers, both **idempotent** — re-running `npm run db:seed` must never duplicate rows or throw:

1. **Reference data (always seeded):** `TicketStatuses` (`NEW`/"جديد", `OPEN`/"مفتوح", `PENDING`/"قيد الانتظار", `RESOLVED`/"تم الحل", `CLOSED`/"مغلق") and `TicketPriorities` (`LOW`/"منخفض", `MEDIUM`/"متوسط", `HIGH`/"مرتفع", `URGENT`/"عاجل"), plus `Roles` (`ADMIN`, `MANAGER`, `AGENT`).
2. **Demo data (development only — guard with `env.NODE_ENV !== 'production'`):** two branches, two departments per branch, a few users, customers, and tickets. This exercises the multi-branch shape and gives Story 03's frontend something real to display.

Implement idempotency by matching on the natural key (`Code`, `Email`, `TicketNumber`) and inserting only when absent — **not** by truncating tables. Wrap each tier in a transaction so a partial failure rolls back.

**Every seeded Arabic string is a genuine Arabic literal in the source file.** Save `seed.ts` as **UTF-8**. This seed data is the end-to-end proof that Arabic survives the driver, the collation, and the column types.

---

### 7 — Wire into the application

**File: `backend-nodejs/src/server.ts`** — call `await AppDataSource.initialize()` **before** `app.listen()`. If it rejects, log the error and exit non-zero: a server that is up but cannot reach its database should not accept traffic. On `SIGINT`/`SIGTERM`, call `AppDataSource.destroy()` before exiting.

**File: `backend-nodejs/src/modules/health/health.routes.ts`** — add `GET /api/v1/health/db`, which runs `SELECT DB_NAME() AS dbName, SUSER_SNAME() AS loginName` through `AppDataSource.query()` and returns both values with `status: 'up'`. On failure it must surface as a **503** through the Story 01 error handler, not a 500.

That endpoint is the acceptance proof: `loginName` should show the developer's Windows account (e.g. `DOMAIN\user`), demonstrating Windows Authentication rather than a SQL login.

---

## Edge Cases & Failure Modes

- **`msnodesqlv8` fails to load** — thrown at `require` time when the ODBC driver is missing or its architecture differs from Node's. Symptom: `The specified module could not be found`. Catch it during `initialize()` and log the remediation ("install Microsoft ODBC Driver 18 for SQL Server, 64-bit"). Do not let a raw native-module stack reach the user.
- **`Login failed for user ''`** — the classic symptom of the driver silently falling back to tedious. It means `driver` was not honoured (usually because it was nested in `extra`). Verify `AppDataSource.options.driver` is defined before `initialize()`.
- **Linux/macOS/CI** — Windows Authentication cannot work off Windows. `npm ci` succeeds because `msnodesqlv8` is optional, but `initialize()` fails. Story 05's integration tests must therefore either target a SQL-login connection or be skipped when `process.platform !== 'win32'`. Flag this explicitly to whoever sets up CI.
- **Database `CRM` does not exist** — `initialize()` fails with `Cannot open database "CRM"`. `npm run db:create` must be run first; document this ordering in the Story 06 README.
- **Named instance** — if the developer's SQL Server is `.\SQLEXPRESS` rather than `.`, `DB_SERVER` must carry the full instance name. In a `.env` file the backslash is literal (no escaping), but in a JSON/JS string it must be escaped as `\\`.
- **`varchar` slipping into a migration** — silently converts Arabic to `?`. Caught by the Test Plan's round-trip test, and by reading the generated migration before running it.
- **Non-UTF-8 source file** — if `seed.ts` is saved as CP1252, the Arabic literals are already corrupt before they reach the database, and the round-trip test fails for a reason that looks like a driver bug. Verify the file encoding first.
- **Multiple cascade paths** — SQL Server aborts a migration creating two cascade paths to the same table. Prevented by `onDelete: 'NO ACTION'` on every FK.
- **`synchronize: true`** — would drop and recreate tables on boot. Must remain `false` in every environment.
- **Concurrent migration runs** — two processes running `migration:run` simultaneously can both attempt the same migration. Run migrations as a deliberate step, never automatically on server start.
- **Partially applied migration** — SQL Server DDL is transactional, so a failed migration rolls back its own statements, but the `__migrations` row is only written on success. Re-running after fixing the error is safe. **Never** hand-edit the `__migrations` table to skip a failure.

---

## Test Plan

Test files are created in **Story 05**; this story's verification is manual. Record these as the database tests Story 05 must add:

1. **Integration — connection** (`src/database/__tests__/data-source.test.ts`): `AppDataSource.initialize()` resolves, and `SELECT DB_NAME()` returns `CRM`. Skip when `process.platform !== 'win32'`.
2. **Integration — Arabic round-trip** (`src/database/__tests__/arabic.test.ts`): insert a `Branch` with `NameAr` set to "الفرع الرئيسي", read it back through a fresh query, and assert **strict equality**. This is the single most important test in the story — it proves the failure mode that broke the previous implementation is gone.
3. **Integration — seed idempotency** (`src/database/__tests__/seed.test.ts`): run the seed twice, assert reference-table row counts are identical after both runs.
4. **Integration — schema shape**: query `INFORMATION_SCHEMA.COLUMNS` and assert **no** user table has a `varchar` (as opposed to `nvarchar`) text column.
5. **Unit — health controller**: `GET /api/v1/health/db` returns `503` in the standard error envelope when the DataSource is not initialized (mock the DataSource; no live server required).

---

## Migration / Rollback

- **Forward:** `npm run db:create` → `npm run migration:run` → `npm run db:seed`.
- **Rollback:** `npm run migration:revert` reverts exactly one migration, which is why every migration needs a real `down()`. To reset a local database completely, drop it in SSMS and re-run the forward sequence — this is acceptable **only** because there is no production data at bootstrap.
- **Half-applied state:** if `migration:run` fails midway, the failing migration's DDL is rolled back by SQL Server and no `__migrations` row is written. Fix the migration and re-run. Do not hand-edit `__migrations`.
- **Before the first real deployment,** revisit this: dropping the database will no longer be an acceptable rollback.

---

## Verification Steps

Run from `backend-nodejs/`.

1. **Prerequisites:** `sqlcmd -S . -Q "SELECT @@VERSION"` succeeds, and the installed ODBC driver's bitness matches `node -p "process.arch"`.
2. **Install:** `npm install` completes and `node -e "require('msnodesqlv8')"` exits `0`.
3. **Backend typechecks:** `npm run typecheck` exits `0` with entities and decorators in place.
4. **Database created:** `npm run db:create`, then confirm in SSMS that `CRM` exists with collation `Arabic_CI_AS`. Run it a second time to confirm it is idempotent.
5. **Migrations run:** `npm run migration:run` applies `InitialCrmSchema`; `SELECT * FROM __migrations` shows one row.
6. **Schema correct:** in SSMS, `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE DATA_TYPE = 'varchar'` returns **zero** rows for user tables.
7. **Rollback works:** `npm run migration:revert` drops the tables cleanly; re-run `migration:run` to restore.
8. **Seed runs:** `npm run db:seed`, then `SELECT NameAr FROM TicketStatuses` in SSMS shows correct Arabic — not `?????` and not blanks. Run the seed again and confirm counts are unchanged.
9. **Backend runs:** `npm run dev` starts and logs a successful database connection.
10. **Windows Auth proven:** `curl http://localhost:3000/api/v1/health/db` returns `dbName: "CRM"` and a `loginName` matching your Windows account.
11. **Arabic over HTTP:** confirm the Arabic returned by the API is intact — this exercises the driver, the collation, and the JSON serializer together.
12. **Failure path:** stop the SQL Server service and restart the app; it must log a clear error and exit non-zero rather than serving traffic.
13. **Regression:** all Story 01 checks still pass — `/api/v1/health`, the `404` envelope, and `/api/docs` all behave as before.

---

## Done Criteria

- [ ] `typeorm`, `mssql`, and `reflect-metadata` are dependencies; `msnodesqlv8` is an **optional** dependency.
- [ ] `import 'reflect-metadata'` is the first line of `src/server.ts`.
- [ ] `AppDataSource` connects to database `CRM` on server `.` using Windows Authentication, with `driver` passed at the **top level** of the options object.
- [ ] `synchronize` is `false` in every environment.
- [ ] `DB_*` variables are validated in the existing `src/config/env.ts` zod schema; booleans are parsed explicitly, not via `z.coerce.boolean()`.
- [ ] `npm run db:create` creates `CRM` with `Arabic_CI_AS` collation and is idempotent.
- [ ] All nine tables from section 5 exist via a **generated migration**, with audit columns, FK indexes, and `onDelete: 'NO ACTION'`.
- [ ] Every human-readable text column is `nvarchar`; UI-facing names have `*En` and `*Ar` pairs.
- [ ] `npm run migration:revert` cleanly reverses the initial migration.
- [ ] `npm run db:seed` seeds reference data plus development-only demo data, is idempotent, and guards demo data behind `NODE_ENV !== 'production'`.
- [ ] Arabic seeded text reads back byte-identical through SSMS **and** through the API.
- [ ] `GET /api/v1/health/db` returns the database name and the Windows login name, and `503` when the database is unreachable.
- [ ] No `sqlcmd`, `execSync`, or string-interpolated SQL anywhere in the codebase.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 03.**
