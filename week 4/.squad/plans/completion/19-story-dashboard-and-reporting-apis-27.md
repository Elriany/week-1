# Story 19 — Agent Dashboard & Management Reporting APIs (Story: 27)

## Prerequisites

- **Story 15 completed** ([15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md)) — `reports.read` and `audit.read` exist and are seeded; `listAudit` exists in `audit.service.ts`.
- **Story 16 completed** ([16-story-sla-configuration-and-status-27.md](16-story-sla-configuration-and-status-27.md)) — `Tickets.firstRespondedAt` and `Tickets.resolvedAt` exist and are populated, `computeSla` is pure, and `policyMapByPriorityId()` returns every policy in one query. **Every SLA figure in this story is derived from those; nothing is recomputed by hand.**
- **Story 12 completed** ([../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md](../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md)) — `assignedUserId`, the status graph, and `TicketHistory`.

**This story is backend-only.** The dashboard and report screens are Story 21.

---

## Story Goal

Two read-only aggregate endpoints, built from plain SQL over the tickets that already exist:

1. **An agent dashboard** — my open tickets, unassigned tickets in my branch, tickets breaching SLA, and a small workload breakdown, each with the query string that reproduces the underlying list.
2. **A management report** — ticket counts by status, priority, and category; per-agent workload and resolution stats; SLA performance indicators; all filterable by date range.
3. **An audit log read endpoint** — the read surface for the table Story 15 created.
4. **One aggregation service** shared by both dashboards, so a "count of open tickets" means the same thing in both places.

**Not in scope:**
- Charts, chart data shaping, or any presentation concern → Story 21.
- Trend lines, period-over-period comparison, forecasting, or cohorts.
- Caching, materialised views, a reporting database, or a scheduled roll-up. **Live queries only.**
- CSV or PDF export.
- Per-user saved report configurations.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/tickets.service.ts` — the whole file (446 lines, plus Story 16's additions). Specifically:
   - `listTickets` (~lines 162–205) — the **filter vocabulary the dashboard links must reproduce**. Every drill-down this story emits has to be expressible as a `GET /tickets` query string, or the link is dead.
   - The `SORT_COLUMNS` map (~lines 191–196) — the sort keys a drill-down may use.
   - `findById`'s join list (~lines 207–220) — the alias names (`status`, `priority`, `category`, `customer`, `assignedUser`) to reuse in aggregate query builders.
2. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — `isUnscoped` (~lines 22–24) and the branch overwrite in `list` (~lines 56–58). **Every aggregate in this story is branch-scoped the same way**, and an Administrator sees across branches.
3. `backend-nodejs/src/modules/tickets/ticket.constants.ts` — `TICKET_STATUS_CODES` (~lines 6–13). `RESOLVED` and `CLOSED` are the two closed states; everything else is open. That definition is used in a dozen places in this story — put it in **one** exported constant.
4. `backend-nodejs/src/modules/sla/sla.service.ts` (created in Story 16) — `computeSla`, `policyMapByPriorityId`, `SLA_STATUSES`. **Reuse `computeSla` rather than writing SQL date maths**; the definition of `BREACHED` must not exist twice.
5. `backend-nodejs/src/modules/tickets/ticketPriority.entity.ts` and `ticketStatus.entity.ts` — both 18 lines. `sortOrder` is the display order for every grouped result.
6. `backend-nodejs/src/common/audit/audit.service.ts` (created in Story 15) — `listAudit(filter)` and `PagedAudit`. The audit endpoint is a thin controller over it.
7. `backend-nodejs/src/modules/users/users.service.ts` — `listUsers` (~lines 108–119) and `PublicUser` (~lines 9–21). Agent workload joins against users; **never spread a `User`** — `passwordHash` rides along.
8. `backend-nodejs/src/modules/tickets/tickets.schemas.ts` — ~lines 25–39. The paging and enum idioms the report query schema copies.
9. `backend-nodejs/src/modules/tickets/tickets.routes.ts` — ~lines 24–39. The route layering, and the ordering rule for literal segments.
10. `backend-nodejs/src/routes/v1.ts` — ~lines 8–17. This story adds two mounts.
11. `backend-nodejs/src/config/data-source.ts` — ~lines 13–22. `type: 'mssql'`, so date functions are T-SQL. **`GROUP BY` with `getRawMany()` is the tool here, not `getMany()`** — loading rows to count them in JavaScript is the failure mode this story exists to avoid.

Grep targets:
- Grep for `getRawMany` in `backend-nodejs/src/` — if there are no hits, this story introduces the pattern; write it once, carefully, and reuse it.
- Grep for `createQueryBuilder` in `backend-nodejs/src/modules/tickets/` to match the existing alias conventions before writing new builders.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Scoping** | Every aggregate is filtered to `req.auth.branchId` unless the caller is `ADMIN`, exactly as `tickets.controller.ts` does (~lines 56–58). An Administrator may pass `branchId` to narrow it. |
| **Open vs closed** | "Open" means the status code is **not** `RESOLVED` and **not** `CLOSED`. Defined once, in one exported constant, used everywhere. |
| **Overdue** | A ticket whose SLA status is `BREACHED`. **Not** a separate age heuristic — one definition of late, from Story 16. |
| **Counting** | Aggregates use SQL `GROUP BY` and return counts. **No endpoint loads ticket rows to count them in JavaScript**, with one documented exception: SLA buckets, which need `computeSla` per row. |
| **The SLA exception** | SLA bucket counts load the **open** tickets in scope with only the columns `computeSla` needs, then bucket in memory. Bounded by open-ticket volume, documented in a comment, and the only place this is allowed. |
| **Date range** | `from` / `to` apply to `Tickets.createdAt` for volume figures and to `Tickets.resolvedAt` for resolution figures. Which one applies where is stated per figure — an ambiguous date filter is worse than none. |
| **Default range** | Absent `from` / `to` means **all time**, not "last 30 days". A silent default makes two viewers disagree about the same number. |
| **Drill-down** | Every bucket carries a `filter` object whose keys are valid `GET /tickets` query parameters. The screen builds a link from it and never invents its own. |
| **Zero rows** | A bucket with no tickets is returned with `count: 0`, not omitted. A missing key makes a chart silently drop a category. |
| **Permissions** | Agent dashboard: `tickets.read`. Management report: `reports.read`. Audit log: `audit.read`. |
| **No writes** | Every endpoint in this story is a `GET`. |

---

## Backend Tasks

### 1 — Shared definitions

**Create file: `backend-nodejs/src/modules/reports/reports.constants.ts`**

```ts
import { TICKET_STATUS_CODES, type TicketStatusCode } from '../tickets/ticket.constants';

/**
 * A ticket is "open" until it is RESOLVED or CLOSED. This is the single
 * definition used by the agent dashboard, the management report, and every
 * drill-down filter. Do not re-derive it anywhere else.
 */
export const CLOSED_STATUS_CODES: TicketStatusCode[] = [
  TICKET_STATUS_CODES.RESOLVED,
  TICKET_STATUS_CODES.CLOSED,
];

export const OPEN_STATUS_CODES: TicketStatusCode[] = (
  Object.values(TICKET_STATUS_CODES) as TicketStatusCode[]
).filter(c => !CLOSED_STATUS_CODES.includes(c));

/** Agents listed on the workload panel, highest open count first. */
export const WORKLOAD_TOP_N = 10;
```

A unit test asserts `OPEN_STATUS_CODES.length + CLOSED_STATUS_CODES.length === Object.keys(TICKET_STATUS_CODES).length` — that is what catches a status added later and silently classified as neither.

### 2 — Aggregation service

**Create file: `backend-nodejs/src/modules/reports/reports.service.ts`**

Shared shapes:

```ts
export interface CountBucket {
  key: string;          // status/priority/category code, or a user id
  labelEn: string;
  labelAr: string;
  count: number;
  /** Query parameters that reproduce this bucket on GET /tickets. */
  filter: Record<string, string>;
}

export interface ReportScope {
  branchId?: string;    // undefined only for an Administrator viewing all
  from?: Date;
  to?: Date;
}
```

Exported functions — **each one is a single `GROUP BY` query** unless noted:

- **`countByStatus(scope)`** — joins `TicketStatuses`, groups on `status.id`, orders by `status.sortOrder`. **Left-joins from the status table**, not from tickets, so a status with zero tickets still returns `count: 0`. Filter: `{ statusId }`.
- **`countByPriority(scope)`** — same shape against `TicketPriorities`. Filter: `{ priorityId }`.
- **`countByCategory(scope)`** — same, plus one extra bucket with `key: 'UNCATEGORIZED'` counting `categoryId IS NULL`. Filter: `{ categoryId }` — and for the uncategorised bucket, an **empty** filter with a comment saying `GET /tickets` has no "no category" predicate, so that bucket is not clickable. Say it rather than emitting a filter that would silently mean "all".
- **`countByChannel(scope)`** — groups on `t.channel`. Filter: `{ channel }`.
- **`agentWorkload(scope)`** — left-joins `Users` on `assignedUserId`, groups on the user, and returns per agent: `openCount`, `resolvedCount`, and `breachedCount`. Ordered by `openCount DESC`, capped at `WORKLOAD_TOP_N`. **Project `id`, `fullNameEn`, `fullNameAr` explicitly.** Filter: `{ assignedUserId }`.
- **`resolutionStats(scope)`** — one query returning `resolvedCount`, `avgResolutionMinutes`, and `medianResolutionMinutes` over tickets whose `resolvedAt` falls in the range. Use T-SQL `DATEDIFF(MINUTE, t.createdAt, t.resolvedAt)`; for the median use `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY …) OVER ()` and take the first row. **If the median proves awkward on this driver, drop it and return only the average** — an approximate figure is worse than an absent one; do not fabricate.
- **`slaBuckets(scope)`** — **the documented exception.** Loads the open tickets in scope selecting only `id`, `createdAt`, `priorityId`, `firstRespondedAt`, `resolvedAt`, `statusId`; calls `policyMapByPriorityId()` once; runs `computeSla` per row; returns one bucket per `SLA_STATUSES` value plus a `noPolicy` count. The comment above it must say why it cannot be a `GROUP BY` and that it is bounded by open-ticket volume.
- **`unassignedCount(scope)`** and **`myOpenCount(scope, userId)`** — trivial `COUNT(*)` queries. Filters: `{ unassigned: 'true' }` and `{ assignedUserId: userId }`.

**Every bucket's `filter` must use the exact parameter names in `listTicketsQuerySchema` (`tickets.schemas.ts` ~lines 25–39).** A `filter` key that schema rejects produces a 422 when the screen follows the link. Add a unit test that runs every emitted filter through that schema.

### 3 — Agent dashboard endpoint

**Create file: `backend-nodejs/src/modules/reports/dashboard.controller.ts`**

`GET /api/v1/dashboard/agent`, permission `tickets.read`. Response:

```ts
{
  myOpen: { count: number; filter: Record<string,string> },
  myBreached: { count: number; filter: Record<string,string> },
  unassigned: { count: number; filter: Record<string,string> },
  branchOpen: { count: number; filter: Record<string,string> },
  myByStatus: CountBucket[],
  myByPriority: CountBucket[],
  slaBuckets: CountBucket[],
}
```

`myOpen`, `myBreached`, and `myByStatus` are scoped to `req.auth!.userId`; the rest to the branch. `filter` on `myBreached` is `{ assignedUserId, slaStatus: 'BREACHED' }` — both parameters exist after Stories 12 and 16, so the link resolves.

Run the sub-queries with `Promise.all`, matching how `tickets.controller.ts` builds its `meta` payload (~lines 133–137).

### 4 — Management report endpoint

**Create file: `backend-nodejs/src/modules/reports/reports.controller.ts`**

`GET /api/v1/reports/overview`, permission `reports.read`. Query: `from`, `to`, `branchId` (Administrator only). Response:

```ts
{
  range: { from: string | null; to: string | null },
  totals: { total: number; open: number; closed: number; unassigned: number },
  byStatus: CountBucket[],
  byPriority: CountBucket[],
  byCategory: CountBucket[],
  byChannel: CountBucket[],
  agentWorkload: Array<{ userId, fullNameEn, fullNameAr, openCount, resolvedCount, breachedCount, filter }>,
  resolution: { resolvedCount, avgResolutionMinutes, medianResolutionMinutes },
  sla: CountBucket[],
}
```

`range` echoes back what was applied, as ISO strings or `null` for all-time, so a screen can label the figures without guessing.

### 5 — Audit log endpoint

**Create file: `backend-nodejs/src/modules/audit/audit.controller.ts`** and **`audit.routes.ts`** — a thin layer over `listAudit` from Story 15.

`GET /api/v1/audit`, permission `audit.read`. Query: `entityType`, `entityId`, `actorUserId`, `action`, `from`, `to`, `page`, `pageSize`. Newest first, paged.

**Audit rows are not branch-scoped** — the table has no branch column, and `audit.read` is held only by Administrator and Manager. State that in a comment on the route so the absence of a scope check reads as deliberate.

### 6 — Schemas

**Create file: `backend-nodejs/src/modules/reports/reports.schemas.ts`**

```ts
const isoDate = z.coerce.date();

export const reportQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  branchId: z.string().uuid().optional(),
}).refine(d => !d.from || !d.to || d.from <= d.to, {
  message: 'from must not be after to',
  path: ['from'],
});
```

`z.coerce.date()` on an unparseable string yields an `Invalid Date`, which Zod reports as a type error — confirm that with a test rather than assuming, and add `.refine(d => !Number.isNaN(d.getTime()))` if it does not.

The audit query schema adds `entityType`, `action` (both `z.string().max(60)` — **not** enums, so an action added later is still queryable), `entityId` / `actorUserId` as uuids, and the standard paging pair.

### 7 — Routes

**Create file: `backend-nodejs/src/modules/reports/reports.routes.ts`** — mounts both `/dashboard` and `/reports` handlers, or split into two route files if that reads better. Each route: `authenticate` → `authorize(...)` → `validate({ query })` → handler.

**File: `backend-nodejs/src/routes/v1.ts`**

```ts
v1.use('/dashboard', dashboardRoutes);
v1.use('/reports', reportsRoutes);
v1.use('/audit', auditRoutes);
```

### 8 — Indexes

**Create file: `backend-nodejs/src/database/migrations/1766000000000-ReportingIndexes.ts`**

Story 20 was originally to take `1766`; **this story takes it and Story 20 takes `1767`** — the overview table records the final assignment.

`up()`:
- `CREATE INDEX [IDX_Tickets_branchId_assignedUserId] ON [Tickets]([branchId], [assignedUserId])` — serves `agentWorkload` and `myOpen`.
- `CREATE INDEX [IDX_Tickets_branchId_createdAt] ON [Tickets]([branchId], [createdAt])` — serves every date-ranged volume query.

`IDX_Tickets_branchId_statusId` already exists from Story 11's migration (`1760000000000-TicketManagement.ts` ~lines 27–29) and `IDX_Tickets_resolvedAt` from Story 16 — **do not recreate either.** Verify both exist before writing this file.

`down()`: drop both new indexes. Dropping an index cannot lose data, so this is the one fully safe revert in the feature.

---

## Edge Cases & Failure Modes

- **An empty database.** Every count is `0`, every bucket array still contains one entry per status, priority, and category. The left-join-from-the-reference-table direction is what guarantees this; joining from `Tickets` returns an empty array and makes a screen render nothing rather than zeros.
- **A status, priority, or category with no tickets.** Returned with `count: 0`, same mechanism.
- **The uncategorised bucket.** `GET /tickets` has no "category is null" predicate (`listTicketsQuerySchema` ~line 32 takes a uuid), so that bucket carries an **empty** `filter` and the screen must render it as non-clickable. Emitting `{ categoryId: '' }` would be rejected as a bad uuid; emitting nothing at all would silently link to "all tickets". Say which in the code comment.
- **A ticket assigned to a soft-deleted user.** The left join returns null for the user; group it under a bucket with `key: 'UNKNOWN'` rather than dropping the tickets. Dropping them makes the workload counts disagree with the status counts, which is the bug that destroys trust in the whole screen.
- **An unassigned ticket in `agentWorkload`.** Excluded — it has its own `unassigned` count. Counting it under a null agent would double-count it.
- **`from` after `to`.** Rejected by the `.refine` with 422 on `from`. Without it, every figure comes back zero and looks like a data problem.
- **An unparseable date string.** Must produce a 422, not an `Invalid Date` that silently matches nothing. Test `?from=yesterday`.
- **A range covering no tickets.** All zeros, `resolution.avgResolutionMinutes` is `null` — **not** `0`. Zero minutes is a claim about speed; null is the absence of data. `resolvedCount: 0` is what tells the screen to say "no data".
- **A non-Administrator passing `branchId`.** Overwritten with their own, matching `tickets.controller.ts` (~lines 56–58). Not rejected.
- **An Administrator omitting `branchId`.** Sees every branch. That is the intended cross-branch view; confirm it in a test so it is not later "fixed" into a bug.
- **The `slaBuckets` in-memory pass.** Loads open tickets in scope. At a few thousand it is fine; at a hundred thousand it is not. The comment must state the bound and name the alternative (a stored, denormalised SLA status maintained on write) so the next reader sees the trade-off was chosen.
- **A ticket whose priority has no SLA policy.** `computeSla` returns null; counted in the `noPolicy` bucket, never silently in `ON_TRACK`. Under-reporting breaches is the worst possible failure for this screen.
- **`PERCENTILE_CONT` unsupported or awkward on this driver.** Drop the median and return `null`, with the field still present so the response shape does not change. **Do not** substitute an average and label it a median.
- **`DATEDIFF(MINUTE, …)` on a `resolvedAt` earlier than `createdAt`.** Impossible through the app — `resolvedAt` is stamped by a transition on an existing row — but a hand-edited row would produce a negative. Filter `resolvedAt >= createdAt` in the resolution query and note why.
- **Counting in JavaScript.** The rule is one `GROUP BY` per figure. If a reviewer finds a `getMany()` followed by a `.filter().length` anywhere except `slaBuckets`, it is a defect.
- **Audit rows are not branch-scoped.** Deliberate; the table has no branch column and `audit.read` is Administrator/Manager only. The comment on the route is what stops this reading as an oversight.
- **A very large audit table.** `listAudit` pages in SQL and the `[createdAt]` index from Story 15 serves the ordering. An unfiltered first page stays cheap.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/reports/__tests__/reports.constants.spec.ts`.**
   - `OPEN_STATUS_CODES` and `CLOSED_STATUS_CODES` are disjoint and together cover every key of `TICKET_STATUS_CODES`.
   - `CLOSED_STATUS_CODES` is exactly `['RESOLVED', 'CLOSED']`.
2. **Unit — create `backend-nodejs/src/modules/reports/__tests__/reports.filters.spec.ts`.** The link-integrity test:
   - Feed a representative `filter` object from every bucket type through `listTicketsQuerySchema` and assert each parses.
   - Assert the uncategorised bucket's filter is empty, not `{ categoryId: '' }`.
   - Assert `myBreached`'s filter contains both `assignedUserId` and `slaStatus`, and that `listTicketsQuerySchema` accepts `slaStatus`.
3. **Unit — create `backend-nodejs/src/modules/reports/__tests__/reports.schemas.spec.ts`.**
   - `from` after `to` fails with the error on `from`.
   - `?from=yesterday` fails rather than yielding an `Invalid Date`.
   - Both absent parses successfully to all-time.
   - The audit schema accepts an `action` string not present in `AUDIT_ACTIONS` — the deliberate non-enum choice.
4. **Integration — create `backend-nodejs/src/modules/reports/__tests__/agentDashboard.itest.ts`.**
   - Seeded fixture: 6 tickets in one branch — 2 assigned to the caller and open, 1 assigned and resolved, 2 unassigned, 1 in another branch.
   - `myOpen.count` is 2; `unassigned.count` is 2; `branchOpen.count` excludes the other branch's ticket.
   - `myByStatus` contains one entry per status, including zeros.
   - Following `myOpen.filter` as a `GET /tickets` query string returns exactly the same 2 tickets — **the end-to-end drill-down assertion.**
   - An Agent can call it; every count is scoped to their branch.
   - On an empty branch every count is 0 and no array is empty.
5. **Integration — create `backend-nodejs/src/modules/reports/__tests__/reportsOverview.itest.ts`.**
   - `totals.total` equals `byStatus` summed.
   - `byCategory` includes an `UNCATEGORIZED` bucket when a ticket has a null category.
   - `byChannel` reflects Story 15's `channel`.
   - `agentWorkload` is ordered by `openCount` descending, capped at `WORKLOAD_TOP_N`, and excludes unassigned tickets.
   - No workload entry contains `passwordHash` — assert on the raw response text.
   - A date range covering nothing returns zeros and `avgResolutionMinutes: null`.
   - `from`/`to` on resolution figures filter by `resolvedAt`, and on volume figures by `createdAt` — construct a ticket created outside the range but resolved inside it and assert it appears in exactly one of the two.
   - An Agent gets **403**; a Manager gets 200.
   - A Manager passing another branch's `branchId` still sees their own.
   - An Administrator omitting `branchId` sees both branches.
   - A ticket whose priority has no SLA policy lands in the `noPolicy` bucket.
6. **Integration — create `backend-nodejs/src/modules/audit/__tests__/auditRead.itest.ts`.**
   - `GET /api/v1/audit` as Administrator returns rows newest first.
   - Filtering by `entityType=Ticket` and `entityId` narrows correctly.
   - `page=2&pageSize=2` returns a disjoint id set with a correct `total`.
   - An Agent and a Supervisor both get **403**.
   - No response contains `passwordHash`.
7. **Regression:** `npm run test:all`. This story adds read-only modules, two indexes, and three `v1.ts` mounts; **no existing test may change.**

---

## Migration / Rollback

- Run `npm run migration:run`. No seed change is required.
- Timestamp `1766000000000` follows Story 17's `1765000000000`. **Story 20 takes `1767000000000`** — the overview table is authoritative.
- Before writing the migration, confirm `IDX_Tickets_branchId_statusId` (Story 11) and `IDX_Tickets_resolvedAt` (Story 16) already exist. Recreating either fails the migration on a duplicate index name.
- `down()` drops two indexes and **loses no data** — the only fully safe revert in this feature.
- **Half-applied state:** if only one index is created, the endpoints still work, just slower. There is no correctness risk.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Unit tests:** `npm test` in `backend-nodejs/`.
4. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
5. **Backend runs:** `npm run dev` in `backend-nodejs/`, then:
   - As `agent@azm.local`: `GET /api/v1/dashboard/agent` → counts and buckets; take `myOpen.filter`, build `GET /api/v1/tickets?…` from it, and confirm the returned count matches.
   - As `agent@azm.local`: `GET /api/v1/reports/overview` → **403**.
   - As `manager@azm.local`: `GET /api/v1/reports/overview` → 200; `byStatus` sums to `totals.total`.
   - As `manager@azm.local`: `GET /api/v1/reports/overview?from=2030-01-01` → all zeros, `avgResolutionMinutes: null`.
   - As `manager@azm.local`: `GET /api/v1/reports/overview?from=2030-01-01&to=2020-01-01` → 422.
   - As `admin@azm.local`: `GET /api/v1/audit?entityType=Ticket&pageSize=5` → 5 newest rows.
   - As `supervisor@azm.local`: `GET /api/v1/audit` → 403.
6. **Query-count sanity:** with `NODE_ENV=development` the data source logs migrations and errors only, so add a temporary `logging: ['query']` locally and confirm `GET /reports/overview` issues a bounded, small number of queries — **not one per ticket.** Revert the logging change before committing.
7. **Swagger:** `GET /api/docs` lists the Dashboard, Reports, and Audit tags.
8. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `OPEN_STATUS_CODES` / `CLOSED_STATUS_CODES` are the single definition of open and closed, and a test proves they partition the status set.
- [ ] Every aggregate is a `GROUP BY` query; the only in-memory pass is `slaBuckets`, and its comment says why.
- [ ] Statuses, priorities, and categories with zero tickets return `count: 0` rather than being omitted.
- [ ] An uncategorised bucket exists and carries an **empty**, non-misleading filter.
- [ ] Every emitted `filter` parses under `listTicketsQuerySchema`, asserted by a unit test.
- [ ] Following a dashboard bucket's filter against `GET /tickets` returns exactly the tickets it counted, asserted by an integration test.
- [ ] All aggregates are branch-scoped; a non-Administrator's supplied `branchId` is overwritten; an Administrator sees all branches.
- [ ] `agentWorkload` excludes unassigned tickets, buckets a deleted assignee under `UNKNOWN`, caps at `WORKLOAD_TOP_N`, and never leaks `passwordHash`.
- [ ] Resolution figures filter on `resolvedAt` and volume figures on `createdAt`, and a test distinguishes them.
- [ ] `avgResolutionMinutes` is `null`, never `0`, when nothing resolved.
- [ ] SLA buckets come from `computeSla`, and a ticket with no policy lands in `noPolicy`.
- [ ] `from` after `to` returns 422; an unparseable date returns 422.
- [ ] `GET /dashboard/agent` needs `tickets.read`, `/reports/overview` needs `reports.read`, `/audit` needs `audit.read`, and each rejects a caller without it.
- [ ] The audit endpoint pages in SQL and its non-branch-scoping is documented at the route.
- [ ] Two reporting indexes exist and neither duplicates one from Story 11 or 16.
- [ ] Every endpoint in this story is a `GET`.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 20.**
