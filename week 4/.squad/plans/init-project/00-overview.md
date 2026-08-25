# init-project — plan overview

Entry point for the **init-project** feature. Stories execute in order by their `NN` prefix.

Source work item: **[15 — US01 Project Bootstrap & Technical Foundation](https://dev.azure.com/elriany2017/AZM%20SQUAD%20CRM/_workitems/edit/15)** · intake at `.squad/stories/init-project/15/intake.md`.

The work item lists **20 implementation tasks**. They are split across six stories so each one is small enough for a scoped executor session to complete and verify in one pass. Every story maps to the same tracker id.

## Stories

| NN | File | Title | Tracker id | Tasks | Depends on |
|----|------|-------|------------|-------|------------|
| 01 | [01-story-backend-foundation-15.md](01-story-backend-foundation-15.md) | Backend foundation: Node.js + TypeScript + modular REST API | 15 | 1–6 | — |
| 02 | [02-story-database-foundation-15.md](02-story-database-foundation-15.md) | Database foundation: SQL Server (Windows Auth), TypeORM migrations, CRM schema and seed | 15 | 7–10 | Story 01 |
| 03 | [03-story-frontend-foundation-15.md](03-story-frontend-foundation-15.md) | Frontend foundation: Vue 3 + TypeScript, Router, Pinia, UI primitives, app shell | 15 | 11–14 | Story 01 (Story 02 recommended) |
| 04 | [04-story-localization-rtl-15.md](04-story-localization-rtl-15.md) | Arabic/English localization and RTL/LTR layout support | 15 | 15–16 | Story 03 (Story 02 recommended) |
| 05 | [05-story-testing-foundation-15.md](05-story-testing-foundation-15.md) | Testing foundation: backend unit/integration and frontend component tests | 15 | 17–18 | Stories 01–04 |
| 06 | [06-story-docs-and-verification-15.md](06-story-docs-and-verification-15.md) | README, environment templates, and clean build verification | 15 | 19–20 | Stories 01–05 |

## Dependency notes

**Execution is strictly sequential.** Each story ends with a STOP instruction; confirm the previous story's Verification Steps before starting the next. Story 06 is the acceptance gate for the whole work item.

Story 03 depends on Story 01 only for the API contract (the error envelope and the `/api/v1` prefix), so 02 and 03 *could* run in parallel if two people are working. Story 04 needs the seeded bilingual data from Story 02 for its final proof, and Story 05 needs all four.

### Contracts established early, consumed later

These are the seams that make the later stories cheap. Breaking one is expensive:

- **Story 01 → all** — the error envelope (`success`, `error.code`, `error.message`, `error.details`, `correlationId`). Story 03's API client parses exactly this shape.
- **Story 01 → 02** — `src/config/env.ts` is the only module that reads `process.env`. Story 02 *extends* its zod schema rather than adding a second config module.
- **Story 01 → 05** — `src/app.ts` exports the Express app **without** calling `listen()`, so Supertest can import it directly.
- **Story 02 → 04** — every UI-facing name is an `*En`/`*Ar` `nvarchar` column pair. Story 04's `useLocalizedName` resolves them.
- **Story 03 → 04** — two hard gates: all layout CSS uses **logical properties** (`margin-inline-start`, never `margin-left`), and no `components/ui/` file contains a hard-coded display string. If either is violated, Story 04 becomes a stylesheet rewrite instead of a configuration change. Story 03's verification step 9 is the check.

### Cross-cutting constraints

- **Windows-only local development.** SQL Server **Windows Authentication** requires the `msnodesqlv8` native driver, which only works with Node.js running on Windows. It is declared as an `optionalDependency` so `npm ci` still succeeds elsewhere — which means Story 05's database tests **skip** rather than fail on a Linux CI runner. A green CI run does not prove the database layer works.
- **TypeORM Windows Auth needs a top-level `driver` option.** `SqlServerDriver.loadDependencies` resolves `this.options.driver ?? PlatformTools.load("mssql")`, and `SqlServerDataSourceOptions` declares `readonly driver?: any`. Passing `driver` inside `extra` — the approach in the widely-cited TypeORM issue #9334, which was closed as *not planned* — is silently ignored and surfaces as `Login failed for user ''`. Story 02 section 3 has the working configuration.
- **Arabic correctness is a build-time concern, not a polish task.** The database is created with `Arabic_CI_AS` collation and every text column is `nvarchar`. The previous implementation (commit `f0776b4`, deleted in `bcd324b`) reached SQL Server by shelling out to `sqlcmd`, then ran a regular expression over every result that replaced the whole U+0080–U+00FF range with spaces — destroying all non-ASCII text. Story 02 replaces that approach outright, and Story 05's Arabic round-trip test is the regression guard.

### Precedent

An earlier Node + Vue + SQL Server implementation lived in this same folder and was removed in commit `bcd324b`. It remains readable in git at `f0776b4` and is cited throughout these plans for its directory layout and naming conventions (`backend-nodejs/`, `frontend-vuejs/`, `*.store.ts`, `*.api.ts`). Its backend was plain JavaScript; this feature is TypeScript throughout. **Reuse its structure, not its code** — and specifically not its data layer.
