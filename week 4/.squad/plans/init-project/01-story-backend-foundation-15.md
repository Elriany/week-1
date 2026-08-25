# Story 01 — Backend foundation: Node.js + TypeScript + modular REST API (Story: 15)

## Prerequisites

- None. This is the first story of the **init-project** feature and creates the repository's first application code.
- Local prerequisites on the developer machine: **Node.js 24.x (Active LTS as of August 2026)** and npm 10+. Verify with `node -v` before starting.
- Stories 02–06 all depend on this story. Do **not** start them until this one is verified.

---

## Story Goal

Stand up the backend application skeleton for the AZM Customer Support CRM:

1. A TypeScript Node.js project that compiles cleanly and runs in watch mode.
2. A **modular** folder structure (feature modules, not a flat controller dump) that Stories 02–05 extend.
3. A **versioned** REST API mounted at `/api/v1`, plus a version-agnostic health endpoint.
4. Environment-based configuration that **fails fast** on missing or malformed variables.
5. Centralized error handling and request validation, so no route handler ever writes an ad-hoc error body.
6. Structured (JSON) application logging with request correlation.
7. Swagger/OpenAPI documentation served in non-production environments.

**Not in scope for this story:** any database connection, entity, or migration (Story 02); any frontend code (Story 03); any test files (Story 05); the README (Story 06). Authentication and business endpoints are **out of scope for the entire feature** — only the foundation is built here.

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — the source work item. Read the **Description** (20 implementation tasks) and **Acceptance criteria**. This story covers tasks **1–6**.
2. `.squad/config.yaml` — confirms `project.name: CRM`, `project.primaryLanguage: typescript`, `project.projectRoots: [.]`. The project root is the `week 4/` directory containing `.squad/`. All paths below are relative to that directory.
3. **Precedent — the previous implementation in this same folder.** An earlier Node + Vue + SQL Server app lived at `week 4/backend-nodejs/` and was removed in commit `bcd324b` ("Delete All Files"). It is still readable from git and is the best guide to house conventions. From the repository root (`D:/AZM Squad/Assignment Weeks`) run:
   - `git show "f0776b4:week 4/backend-nodejs/package.json"` — dependency baseline: `express`, `helmet`, `cors`, `express-rate-limit`, `winston`, `swagger-jsdoc`, `swagger-ui-express`.
   - `git ls-tree -r --name-only f0776b4 -- "week 4/backend-nodejs/src"` — the previous layout: `config/`, `constants/`, `controllers/`, `middleware/`, `repositories/`, `routes/`, `services/`, `utils/`.
   - `git show "f0776b4:week 4/backend-nodejs/src/middleware/correlationId.middleware.js"` — the correlation-id pattern reused in section 5.
4. **Reuse the directory name `backend-nodejs/`** so this work is continuous with the previous implementation rather than a parallel tree.

> **The previous implementation was plain JavaScript (CommonJS).** This story is **TypeScript**. Reuse its *structure and naming conventions*, not its code.

---

## Implementation tasks

### 1 — Initialize the TypeScript project

**Create file: `backend-nodejs/package.json`**

This project emits **CommonJS**, because the TypeORM decorators introduced in Story 02 are simplest on CommonJS. Do **not** set `"type": "module"`.

```json
{
  "name": "azm-crm-backend",
  "version": "1.0.0",
  "description": "AZM Customer Support CRM — Node.js + Express + TypeScript backend",
  "main": "dist/server.js",
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

Runtime dependencies: `express`, `helmet`, `cors`, `express-rate-limit`, `dotenv`, `zod`, `winston`, `swagger-jsdoc`, `swagger-ui-express`.

Dev dependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`, `@types/swagger-jsdoc`, `@types/swagger-ui-express`.

**Create file: `backend-nodejs/tsconfig.json`**

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "CommonJS",
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    // Required by Story 02 (TypeORM entities). Set now so Story 02 needs no tsconfig edit.
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Create file: `backend-nodejs/.gitignore`** — ignore `node_modules/`, `dist/`, `.env`, `*.log`, `logs/`.

**Do not** commit a `.env`. The template is added in Story 06.

---

### 2 — Modular structure and API versioning

Create this tree. Directories that later stories fill get a `.gitkeep`.

```
backend-nodejs/src/
  server.ts                  # process entrypoint: starts the HTTP listener
  app.ts                     # builds and returns the Express app (no listen)
  config/
    env.ts                   # validated environment configuration
    swagger.ts               # OpenAPI spec construction
  common/
    errors/
      AppError.ts            # base operational error + typed subclasses
    middleware/
      correlationId.ts
      requestLogger.ts
      validate.ts
      errorHandler.ts
      notFound.ts
    utils/
      logger.ts
  modules/                   # one folder per feature module
    health/
      health.controller.ts
      health.routes.ts
  routes/
    v1.ts                    # mounts every v1 module router
  types/
    express.d.ts
```

**Why `app.ts` is separate from `server.ts`:** Story 05 imports the app object directly into Supertest without opening a port. **Do not** call `app.listen()` inside `app.ts`.

**Create file: `backend-nodejs/src/routes/v1.ts`**

```ts
import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';

const v1 = Router();

// One line per feature module. Later stories append here.
v1.use('/health', healthRoutes);

export default v1;
```

**Create file: `backend-nodejs/src/app.ts`** — assemble in this exact order; the order is load-bearing:

1. `helmet()`
2. `cors({ origin: env.FRONTEND_ORIGIN, credentials: true })`
3. `express.json({ limit: '1mb' })` and `express.urlencoded({ extended: true })`
4. `correlationId` middleware
5. `requestLogger` middleware
6. `rateLimit` — applied to `/api` only
7. Swagger UI mount (section 6) — **skipped when `NODE_ENV === 'production'`**
8. `app.use('/api/v1', v1)`
9. `notFound` middleware
10. `errorHandler` middleware — **registered last**, and declaring **four** parameters

Also add a **version-agnostic** liveness route `GET /health` *outside* `/api/v1`, so infrastructure probes never need to track the API version.

**Versioning rule:** every future business route mounts under `/api/v1`. When `v2` arrives, add `src/routes/v2.ts` and mount both — **never** rewrite `v1` in place.

---

### 3 — Environment-based configuration

**Create file: `backend-nodejs/src/config/env.ts`**

Load `dotenv` **once**, at the top of this module, before anything reads `process.env`. Validate with zod, then export a frozen typed object.

```ts
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print every offending variable, then exit non-zero. Never start on a partial config.
  console.error('Invalid environment configuration:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
```

**Critical:** nothing outside this file may read `process.env` directly. Story 02 adds the `DB_*` variables to this same schema.

---

### 4 — Centralized error handling and request validation

**Create file: `backend-nodejs/src/common/errors/AppError.ts`**

```ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, resource + ' not found', 'NOT_FOUND'); }
}
export class ValidationError extends AppError {
  constructor(details: unknown) { super(422, 'Validation failed', 'VALIDATION_ERROR', details); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, message, 'CONFLICT'); }
}
```

**Create file: `backend-nodejs/src/common/middleware/errorHandler.ts`**

The single source of truth for error responses. Every error body uses this envelope:

```jsonc
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [] },
  "correlationId": "…"
}
```

Rules:
- An `AppError` maps to its own `statusCode`.
- Anything else is a **500** whose `message` is replaced with a generic string — **never leak an internal message or stack to the client**.
- Log the full error with stack at `error` level, including the correlation id.
- Include `error.stack` in the body **only** when `env.NODE_ENV !== 'production'`.
- Guard re-entry: `if (res.headersSent) return next(err);` as the first statement.

**Create file: `backend-nodejs/src/common/middleware/validate.ts`**

A higher-order middleware validating `body`, `params`, and `query`, **replacing** the request values with parsed output so downstream code receives coerced types:

```ts
import type { RequestHandler } from 'express';
import { ZodType } from 'zod';
import { ValidationError } from '../errors/AppError';

interface Schemas { body?: ZodType; params?: ZodType; query?: ZodType }

export const validate = (schemas: Schemas): RequestHandler => (req, _res, next) => {
  for (const key of ['body', 'params', 'query'] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) return next(new ValidationError(result.error.format()));
    Object.defineProperty(req, key, { value: result.data, writable: true });
  }
  next();
};
```

> **Express 5 note:** `req.query` is getter-only; assigning `req.query = …` throws at runtime. Use `Object.defineProperty` as shown. This also works on Express 4.

Also create `notFound.ts`, forwarding `new NotFoundError('Route')` to `next()` so unknown routes flow through the same envelope.

---

### 5 — Structured logging

**Create file: `backend-nodejs/src/common/utils/logger.ts`**

Winston logger: **JSON** format in production, colourized human-readable in development. Level from `env.LOG_LEVEL`. Always include a timestamp and `winston.format.errors({ stack: true })`.

**Create file: `backend-nodejs/src/common/middleware/correlationId.ts`**

Read the incoming `x-correlation-id` header; when absent, generate one with `randomUUID()` from `node:crypto` (**no `uuid` dependency needed on Node 24**). Attach it to `req` and echo it on the response header.

**Create file: `backend-nodejs/src/types/express.d.ts`** so `req.correlationId` typechecks:

```ts
declare global {
  namespace Express {
    interface Request { correlationId: string }
  }
}
export {};
```

**Create file: `backend-nodejs/src/common/middleware/requestLogger.ts`**

Log one line per completed request on the response `finish` event: method, original URL, status code, duration in ms, correlation id. **Do not log request bodies** — they will carry customer PII once the CRM has real endpoints.

---

### 6 — Swagger / OpenAPI

**Create file: `backend-nodejs/src/config/swagger.ts`**

Build the spec with `swagger-jsdoc`: OpenAPI `3.0.3`, title `"AZM Customer Support CRM API"`, version `1.0.0`, server URL `/api/v1`. Scan `./src/modules/**/*.routes.ts` for JSDoc annotations.

Mount in `app.ts` at `/api/docs` via `swagger-ui-express`, and expose the raw document at `/api/docs.json`.

**Guard the mount:** when `env.NODE_ENV === 'production'`, skip it entirely.

Annotate `health.routes.ts` with a JSDoc `@openapi` block so the spec is non-empty and the setup is provably working.

---

## Edge Cases & Failure Modes

- **Missing or malformed env var** — e.g. `PORT=abc`, or a non-URL `FRONTEND_ORIGIN`. The process prints every offending key and calls `process.exit(1)`. Enforced in `src/config/env.ts`. A half-configured server must never bind a port.
- **Port already in use** — `server.ts` handles the `EADDRINUSE` error event, logs it, and exits non-zero rather than raising an unhandled rejection.
- **Error handler registered too early** — if `app.use(errorHandler)` precedes the routers, errors bypass it and Express returns its default HTML page. Register it **last**, after `notFound`.
- **Error middleware arity** — a handler declared with three parameters is silently treated as ordinary middleware. It must declare **four** (`err, req, res, next`) even when `next` is unused.
- **Response already sent** — an error thrown after headers are flushed makes `res.status()` throw `ERR_HTTP_HEADERS_SENT`. Guarded by the `res.headersSent` check in `errorHandler.ts`.
- **Non-`Error` throw** — a thrown string or object has no `.stack`. Normalize any unknown value to an `Error` before logging.
- **Async handler rejection** — Express 4 does **not** forward rejected promises to the error handler; an async route that throws will hang the request. Either use Express 5 (which forwards them) or wrap every async handler. Decide once and apply consistently across the codebase.
- **Unicode in request payloads** — Arabic input must survive round-tripping. `express.json()` decodes UTF-8 correctly; **never** add middleware that strips non-ASCII characters. The previous implementation did exactly that — see the warning in Story 02.
- **CORS preflight** — the frontend runs on a different origin in development (`:5173` vs `:3000`). Register `cors()` **before** the routers or `OPTIONS` preflight fails.
- **Swagger leaking in production** — the docs route must be *absent*, not merely unlinked, when `NODE_ENV=production`.

---

## Test Plan

No test files are created here — the harness is configured in **Story 05**. Structure the code so it is testable:

1. `src/app.ts` exports the Express app **without** listening, so Story 05 can hand it to Supertest.
2. `src/config/env.ts` exports a plain object, so tests can stub `process.env` before import.
3. Verification for this story is manual — see **Verification Steps**.

The first tests Story 05 will add against this code:
- `GET /health` returns `200`.
- `GET /api/v1/health` returns `200` with a JSON body.
- An unknown route returns `404` in the standard error envelope.
- A route that throws returns `500` with **no** stack in the body when `NODE_ENV=production`.

---

## Verification Steps

Run everything from `backend-nodejs/`.

1. **Node version:** `node -v` prints `v24.x`.
2. **Install:** `npm install` completes with no `ERESOLVE` failure.
3. **Backend typechecks:** `npm run typecheck` exits `0`.
4. **Backend builds:** `npm run build` produces `dist/server.js`.
5. **Backend runs:** `npm run dev` starts and logs the listening port.
6. **Health:** `curl http://localhost:3000/api/v1/health` returns `200` with a JSON body; `curl http://localhost:3000/health` also returns `200`.
7. **Correlation id:** `curl -i http://localhost:3000/api/v1/health` shows an `x-correlation-id` response header; supplying your own echoes it back unchanged.
8. **404 envelope:** `curl -i http://localhost:3000/api/v1/does-not-exist` returns `404` with `success: false` and an `error.code`.
9. **Validation:** temporarily add a schema-guarded route, post an invalid body, confirm `422` with `error.details` populated, then remove the route.
10. **Swagger:** open `http://localhost:3000/api/docs` — the UI renders and lists the health endpoint. `http://localhost:3000/api/docs.json` returns valid JSON.
11. **Production guard:** `NODE_ENV=production npm start` — `/api/docs` returns `404`.
12. **Fail-fast config:** `PORT=abc npm run dev` prints the offending variable and exits non-zero.
13. **Regression:** none — this story introduces the first application code.

---

## Done Criteria

- [ ] `backend-nodejs/` exists with `package.json`, `tsconfig.json`, and `.gitignore`; `engines.node` is `>=24.0.0`.
- [ ] `npm run build` and `npm run typecheck` both exit `0` under `strict: true`.
- [ ] `experimentalDecorators` and `emitDecoratorMetadata` are enabled, ready for Story 02.
- [ ] The `src/` tree matches the layout in section 2, with `app.ts` separate from `server.ts`.
- [ ] All API routes are served under `/api/v1`; a version-agnostic `/health` also responds.
- [ ] `src/config/env.ts` validates configuration with zod and exits non-zero on invalid input.
- [ ] Every error response uses the single envelope from section 4; no handler writes an ad-hoc error body.
- [ ] Unhandled errors return `500` and never expose an internal message or stack in production.
- [ ] Requests are logged as structured JSON with a correlation id echoed on the response header.
- [ ] Swagger UI is reachable at `/api/docs` in development and absent in production.
- [ ] No database, frontend, or test code was added.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 02.**
