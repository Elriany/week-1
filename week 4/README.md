# AZM Customer Support CRM

A full-stack, multi-branch, multi-department customer support system with bilingual (Arabic/English) and RTL/LTR layout support. This is the technical foundation for a modern, modular, TypeScript-first CRM backend and Vue 3 frontend.

---

## Tech Stack

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

---

## Prerequisites

### ⚠️ Windows is Required for Local Development

The database layer uses **SQL Server Windows Authentication**, which depends on the `msnodesqlv8` native driver. This **only works on Windows**. It does not work on macOS, Linux, or inside a Linux container.

### Required Software

- **Node.js 24.x LTS** — verify with `node --version`
- **SQL Server** (any recent edition, including Express) reachable at `.` (the local default instance) or `.\SQLEXPRESS` (a named instance)
- **Microsoft ODBC Driver 18 for SQL Server** — matching Node's architecture (x64 or x86)
  - Verify Node's bitness: `node -p "process.arch"` → should output `x64` or `x32`
  - Verify driver bitness matches before installing
  - Download from [Microsoft ODBC Driver for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

---

## Project Structure

```
backend-nodejs/src/
  common/          # Cross-cutting concerns (middleware, errors, utilities)
  config/          # Environment, database configuration
  database/        # Migrations and seed data
  modules/         # Feature modules (branches, departments, users, etc.)
  types/           # TypeScript augmentation
  app.ts           # Express app (no listen())
  server.ts        # Process entrypoint

frontend-vuejs/src/
  components/      # Vue components (ui/ primitives, layout/ shells, common/)
  composables/     # Reusable composition functions
  i18n/            # Translation catalogues (en.json, ar.json)
  stores/          # Pinia stores
  views/           # Page-level components
  router/          # Vue Router configuration
  api/             # API client
  assets/          # Styles, fonts
  types/           # Shared types
  main.ts          # Entrypoint (plugins, router, Pinia)
```

---

## Getting Started

This **exact sequence** must be followed. Each step fails confusingly when run out of order.

### 1. Backend Dependencies

```bash
cd backend-nodejs
npm install
cp .env.example .env
# Edit .env if your DB_SERVER or ODBC_DRIVER differs from defaults
```

### 2. Database Bootstrap

**These steps must run in this order.** TypeORM cannot create the database it connects to.

```bash
npm run db:create      # Creates the CRM database (Arabic_CI_AS collation)
npm run migration:run  # Applies the schema
npm run db:seed        # Reference data + development demo data
```

### 3. Run Backend

Opens **http://localhost:3000**. Leave this terminal running.

```bash
npm run dev
```

### 4. Frontend (Second Terminal)

```bash
cd ../frontend-vuejs
npm install
cp .env.example .env
npm run dev            # Opens http://localhost:5173
```

---

## Available Scripts

### Backend

| Command | What it does |
|---|---|
| `npm run dev` | Watch mode; rebuilds on file changes |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled `dist/server.js` (production-like) |
| `npm test` | Unit tests (no database required) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:integration` | Integration tests (Windows only, database required) |
| `npm run test:all` | Both unit and integration tests |
| `npm run db:create` | Create the CRM database |
| `npm run migration:generate` | Generate a new migration after entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Undo the last migration |
| `npm run db:seed` | Populate reference and demo data |

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR at `:5173` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run `vue-tsc` to check types |
| `npm test` | Component tests |
| `npm run test:watch` | Component tests in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | Run linters (oxlint + eslint) |

---

## Key URLs

- **Backend API base:** http://localhost:3000/api/v1
- **Health check:** http://localhost:3000/api/v1/health (returns `{"status":"up"}`)
- **Database health:** http://localhost:3000/api/v1/health/db (Windows login name + database name)
- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI schema:** http://localhost:3000/api/docs.json
- **Frontend:** http://localhost:5173

---

## Architecture Notes

### API Versioning

All endpoints are prefixed with `/api/v1`. New versions are added alongside old ones; endpoints in a version are never modified after release.

### Error Envelope

Every API response follows a single shape:

```json
{
  "success": true,
  "data": { /* ... */ },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Or on error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { "field": "email" }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Database Migrations

Migrations are the **only** path for schema changes. TypeORM `synchronize` is permanently `false`. New migrations are applied with `npm run migration:run`.

### Authentication and Authorization

Authentication is JWT bearer-token based. `POST /api/v1/auth/login` returns an access token (1 hour) and a refresh token (7 days); every other endpoint requires `Authorization: Bearer <accessToken>`.

Authorization is permission-based. Each user holds exactly one **role**, and each role holds a set of **permission** codes (`users.read`, `tickets.update`, …). Routes declare what they need:

```ts
router.get('/', authorize(PERMISSIONS.USERS_READ), usersController.list);
```

The permission catalogue and the role-to-permission mapping live in `src/modules/users/permissions.constants.ts`. Changing that file requires re-running `npm run db:seed` — the seed re-applies the mapping on every run.

Two properties worth knowing:

- **Deactivation is immediate.** `authenticate` re-reads the user on every request instead of trusting the token claims, so setting `isActive = false` invalidates tokens already in circulation. It costs one indexed lookup per request.
- **Non-administrators are branch-scoped.** A Manager or Supervisor only sees and edits users in their own branch; passing a different `branchId` as a query filter does not widen that. Administrators are unscoped.

### Seeded accounts (development only)

`npm run db:seed` creates one account per role, all with the password `Passw0rd!`. The seed is guarded by `NODE_ENV !== 'production'`.

| Email | Role | Branch |
|---|---|---|
| `admin@azm.local` | Administrator | HQ |
| `manager@azm.local` | Manager | HQ |
| `supervisor@azm.local` | Supervisor | HQ |
| `agent@azm.local` | Agent | HQ |
| `riyadh.agent@azm.local` | Agent | Riyadh |

The Riyadh account exists so branch scoping is observable: sign in as `manager@azm.local` and it is absent from the users list.

### Localization

Every UI string comes from `src/i18n/locales/en.json` (English) and `ar.json` (Arabic). Backend data with bilingual columns (`nameEn`, `nameAr`) resolve through the `useLocalizedName` composable.

### CSS Logical Properties

Use **logical properties** only — `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, never `left`/`right`. This is the single rule that keeps RTL working as the locale changes.

---

## Testing

```bash
# Backend unit tests (no database)
cd backend-nodejs && npm test

# Backend integration tests (Windows only; database required)
npm run test:integration

# Frontend component tests
cd frontend-vuejs && npm test
```

### Important: Database Tests Skip on Non-Windows

Database integration tests **automatically skip** when not running on Windows. A green test run on macOS, Linux, or a non-Windows CI runner does **not** mean the database layer was tested. Use a Windows runner or a SQL-login connection for CI.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `The specified module could not be found` on start | The ODBC driver is missing or its bitness differs from Node's. Verify `node -p "process.arch"` and install Microsoft ODBC Driver 18 matching that bitness. |
| `Login failed for user ''` | The connection fell back to `tedious` (TCP). Confirm `driver` is passed at the **top level** of TypeORM's DataSource options, not inside `extra`. |
| `Cannot open database "CRM"` | `npm run db:create` was not run before `migration:run`. Run it now; migrations assume the database exists. |
| Backend exits immediately, listing environment variable names | Invalid `.env`; `env.ts` fails fast by design. Fix the listed variables. |
| Arabic displays as `?????` | A `varchar` column was created (text is not preserved). All text columns must be `nvarchar`. Check migrations. |
| Arabic displays as blanks or mojibake | A source file was not saved as UTF-8. Re-save all `.ts`, `.vue`, and `.json` files as UTF-8 without BOM. |
| UI is half English, half Arabic | A translation key is missing from `ar.json`. Run `npm test` and check `locale-parity.spec.ts` output. |
| Layout does not mirror in Arabic | Physical CSS properties (`left`, `right`, `margin-left`, etc.) crept in. Grep `src/` for these and convert to logical properties (`inset-inline-start`, `margin-inline-end`, etc.). |
| Frontend shows "backend unreachable" | The backend is not running, or the Vite proxy target does not match its port. Verify backend runs at `:3000` and check `vite.config.ts` proxy target. |
| `EADDRINUSE` on port 3000 or 5173 | Another process is using the port. Change `PORT` in `.env` or the Vite `server.port` in `vite.config.ts`, or kill the process holding the port. |
| `401` on every API call right after signing in | The access token expired (1 hour) or the account was deactivated. Sign in again. |
| `429` from `/auth/login` | The credential rate limiter allows 10 attempts per 15 minutes per IP. Wait, or restart the backend to reset its in-memory counter. |
| `403` where you expect data | The role lacks the permission the route requires, or the record belongs to another branch. Check `permissions.constants.ts` and the user's `branchId`. |
| Roles list is empty, or a new permission has no effect | `permissions.constants.ts` changed without re-seeding. Run `npm run db:seed`. |

---

## Known Limitations

- **Windows-only:** Local development requires Windows due to Windows Authentication.
- **No password reset:** There is no self-service reset or email verification. An administrator must create accounts.
- **No token revocation list:** A refresh token stays valid until it expires. Deactivating the account is the way to cut off access, and it takes effect immediately.
- **English-only error messages:** Backend API errors are in English. The UI translates the cases it recognises by status code and falls back to the server text.
- **No CI configured:** This is the foundation; CI pipeline is out of scope.

---

## Related Documentation

- [`backend-nodejs/README.md`](backend-nodejs/README.md) — Backend module layout and routing conventions.
- [`frontend-vuejs/README.md`](frontend-vuejs/README.md) — Frontend component conventions and translation setup.

---

**Questions?** Follow the troubleshooting section above, check the READMEs in each folder, or review the Swagger documentation at `/api/docs`.
