# Story 16 — Simplified SLA Configuration & Ticket SLA Status (Story: 27)

## Prerequisites

- **Story 15 completed** ([15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md)) — `sla.manage` exists in `PERMISSIONS`, `recordAudit` / `recordAuditSafe` exist, `AUDIT_ACTIONS.SLA_POLICY_UPDATED` and `AUDIT_ENTITY_TYPES.SLA_POLICY` exist, and the named `app` export makes integration tests runnable.
- **Story 12 completed** ([../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md](../ticket/12-story-ticket-lifecycle-assignment-and-history-18.md)) — `transitionTicket`, `TICKET_STATUS_CODES`, `TICKET_TRANSITIONS`, and the transactional-write pattern.

**This story is backend-only.** SLA badges on screens are Stories 21–23.

---

## Story Goal

Give every ticket a meaningful, computed service-level state without adding a scheduler, a queue, or a notification provider:

1. **A minimal SLA configuration** — one policy per priority, holding a response target and a resolution target in **minutes**.
2. **Two timestamps on `Tickets`** — `firstRespondedAt` and `resolvedAt` — stamped automatically by the lifecycle code that already runs.
3. **A computed SLA status** per ticket: `ON_TRACK`, `AT_RISK`, `BREACHED`, or `MET`, derived on read from the policy and the timestamps.
4. **SLA data on every ticket payload** so detail screens and dashboards read one contract.
5. **Rule-based escalation, in-process only** — a breached ticket at a non-terminal status is auto-escalated one priority level and audited. No email, no SMS, no external notifier.

**Not in scope:**
- Business-hours or calendar-aware SLA maths. Targets are **wall-clock minutes**; say so in the code.
- Per-customer, per-branch, or per-category policies. **One policy per priority**, full stop.
- A background job, cron, or timer. SLA status is computed **on read**; escalation fires on the **next write** to the ticket.
- Any notification transport. Escalation writes an audit row and a `TicketHistory` row; that is the notification.
- SLA display, badges, or filters in the UI → Stories 21 and 23.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — the whole file (79 lines, plus the `channel` column added by Story 15). `assignedUserId` (~lines 46–51) is the precedent for a **nullable** column; the two new timestamps follow it.
2. `backend-nodejs/src/modules/tickets/ticketPriority.entity.ts` — the whole file (18 lines). `code`, `nameEn`, `nameAr`, `sortOrder`. **`sortOrder` is the escalation ladder** — the seed writes `LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3` (`seed.ts` ~lines 57–62).
3. `backend-nodejs/src/modules/tickets/ticket.constants.ts` — `TICKET_STATUS_CODES` (~lines 6–13) and `TICKET_TRANSITIONS` (~lines 43–50). `RESOLVED` and `CLOSED` are the two states that stop the resolution clock; `CLOSED` has no outgoing edges.
4. `backend-nodejs/src/modules/tickets/tickets.service.ts` — the whole file (446 lines). Specifically:
   - `toPublicTicket` (~lines 71–99) — the payload every screen reads; it  gains an `sla` object.
   - `listTickets` (~lines 162–205) — where the SLA projection must be applied per row **without** an N+1 query.
   - `transitionTicket` (~lines 263–319) — the transaction that stamps `resolvedAt`.
   - `assignTicket` (~lines 330–446) — the transaction that stamps `firstRespondedAt`.
5. `backend-nodejs/src/modules/tickets/ticketNotes.service.ts` — `createNote`. The **other** first-response signal: a customer-visible note. Read the function signature and its transaction handling before wiring the stamp.
6. `backend-nodejs/src/common/audit/audit.service.ts` (created in Story 15) — `recordAudit(manager, input)` and `AUDIT_ACTIONS`. Escalation audits through the **transactional** form.
7. `backend-nodejs/src/modules/tickets/ticketHistory.service.ts` — `recordHistory` (~lines 80–92) and `TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED` (`ticket.constants.ts` ~line 67). Escalation reuses that action; **do not invent a new one**.
8. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — `meta` (~lines 131–146). The SLA policies join the `meta` payload so one call still primes a screen.
9. `backend-nodejs/src/modules/tickets/tickets.routes.ts` — ~lines 28–39 (`/meta`) and ~lines 179–184 (`PATCH /:id/status`). New SLA routes follow the same `authorize` + `validate` layering, and **must be registered before `/:id`** if they use a literal path segment — see how `/assignable-users` (~lines 104–108) is placed above `/:id` (~lines 128–133).
10. `backend-nodejs/src/database/migrations/1763000000000-CrmFoundation.ts` (created in Story 15) — the migration style and the timestamp this one follows.
11. `backend-nodejs/src/database/seed.ts` — ~lines 57–71 (the four priorities). Task 6 seeds one SLA policy per priority in the same loop style.

Grep targets:
- Grep for `toPublicTicket` in `backend-nodejs/src/` to find **every** call site that will start returning the `sla` object.
- Grep for `TICKET_STATUS_CODES.RESOLVED` to see where the resolution boundary is already handled.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Policy granularity** | Exactly one `SlaPolicies` row per `TicketPriorities` row, linked by a **unique** `priorityId`. No other dimension. |
| **Units** | `responseTargetMinutes` and `resolutionTargetMinutes` are integers ≥ 1. Wall-clock, not business hours. |
| **Clock start** | `Tickets.createdAt`. Never re-based by a reassignment or a status change. |
| **Response clock stop** | The first of: an assignment, or a **customer-visible** note (`isInternal: false`). An internal note does **not** stop it — the customer has heard nothing. |
| **Resolution clock stop** | The first transition into `RESOLVED` or `CLOSED`. |
| **Stamps are write-once** | Once `firstRespondedAt` or `resolvedAt` is non-null it is **never** overwritten, including on a reopen from `RESOLVED → CLOSED`. |
| **AT_RISK threshold** | ≥ 80 % of the target elapsed and the target not yet passed. One shared constant, applied to both clocks. |
| **Status precedence** | Resolution outranks response. A ticket whose resolution target is breached is `BREACHED` even if it was responded to on time. |
| **MET** | Both applicable clocks stopped inside their targets. A ticket at `RESOLVED`/`CLOSED` is never `AT_RISK` or `ON_TRACK`. |
| **No policy** | A priority with no `SlaPolicies` row yields `sla: null`. **Never** a default target, never a 500. |
| **Escalation trigger** | Computed on write. When a ticket is `BREACHED` on resolution, is at a non-terminal status, and is not already at the top `sortOrder`, its priority moves up one step. |
| **Escalation is idempotent** | A ticket already escalated once for a given breach does not climb again on the next write. Guarded by comparing against the top `sortOrder` and by the history row that already exists. |
| **Who may configure** | `sla.manage` — Administrator and Manager only. Reading SLA data needs only `tickets.read`. |

---

## Backend Tasks

### 1 — SLA constants

**Create file: `backend-nodejs/src/modules/sla/sla.constants.ts`**

```ts
/**
 * Simplified SLA states. Computed on read from the policy and the ticket's
 * timestamps — nothing is stored. Wall-clock minutes only: business hours,
 * holidays, and time-zone-aware calendars are deliberately out of scope.
 */
export const SLA_STATUSES = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  BREACHED: 'BREACHED',
  MET: 'MET',
} as const;

export type SlaStatus = (typeof SLA_STATUSES)[keyof typeof SLA_STATUSES];

/** Fraction of a target that must elapse before a live clock reads AT_RISK. */
export const SLA_AT_RISK_RATIO = 0.8;

/** Defaults seeded per priority code. Minutes, wall-clock. */
export const SLA_POLICY_DEFAULTS: Array<{
  priorityCode: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
}> = [
  { priorityCode: 'URGENT', responseTargetMinutes: 30, resolutionTargetMinutes: 240 },
  { priorityCode: 'HIGH', responseTargetMinutes: 60, resolutionTargetMinutes: 480 },
  { priorityCode: 'MEDIUM', responseTargetMinutes: 240, resolutionTargetMinutes: 1440 },
  { priorityCode: 'LOW', responseTargetMinutes: 480, resolutionTargetMinutes: 2880 },
];
```

### 2 — Entity and ticket columns

**Create file: `backend-nodejs/src/modules/sla/slaPolicy.entity.ts`**

Follow `ticketCategory.entity.ts` for shape and `ticket.entity.ts` (~lines 60–65) for the `@ManyToOne` + `@JoinColumn` pair.

```ts
@Entity('SlaPolicies')
@Index(['priorityId'], { unique: true })
export class SlaPolicy extends BaseEntity {
  @Column({ type: 'uniqueidentifier', unique: true })
  priorityId!: string;

  @ManyToOne(() => TicketPriority, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'priorityId' })
  priority?: TicketPriority;

  /** Wall-clock minutes from ticket creation to first response. */
  @Column({ type: 'int' })
  responseTargetMinutes!: number;

  /** Wall-clock minutes from ticket creation to RESOLVED or CLOSED. */
  @Column({ type: 'int' })
  resolutionTargetMinutes!: number;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;
}
```

**File: `backend-nodejs/src/modules/tickets/ticket.entity.ts`**

Add after the `channel` column from Story 15:

```ts
/**
 * Set once, by the first assignment or first customer-visible note. Never
 * overwritten — a reassignment does not restart the response clock.
 */
@Column({ type: 'datetime2', nullable: true })
firstRespondedAt?: Date | null;

/** Set once, by the first transition into RESOLVED or CLOSED. */
@Column({ type: 'datetime2', nullable: true })
resolvedAt?: Date | null;
```

### 3 — SLA service

**Create file: `backend-nodejs/src/modules/sla/sla.service.ts`**

Exported types:

```ts
export interface SlaSnapshot {
  status: SlaStatus;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  responseDueAt: Date;
  resolutionDueAt: Date;
  respondedAt: Date | null;
  resolvedAt: Date | null;
  /** Negative when the deadline has passed. Null once the clock has stopped. */
  minutesToResponseDue: number | null;
  minutesToResolutionDue: number | null;
}

export interface SlaPolicyInput {
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  isActive?: boolean;
}
```

Exported functions:

- **`computeSla(ticket, policy, now = new Date()): SlaSnapshot | null`** — **pure**, no database access. Returns `null` when `policy` is null or `policy.isActive` is false. Order of evaluation:
  1. `responseDueAt = createdAt + responseTargetMinutes`; `resolutionDueAt = createdAt + resolutionTargetMinutes`.
  2. If `resolvedAt` is set: resolution is `MET` when `resolvedAt <= resolutionDueAt`, else `BREACHED`.
  3. If `resolvedAt` is null: resolution is `BREACHED` when `now > resolutionDueAt`, `AT_RISK` when `now >= createdAt + resolutionTarget * SLA_AT_RISK_RATIO`, else `ON_TRACK`.
  4. Compute the response state the same way against `firstRespondedAt`.
  5. **Resolution outranks response**; between the two, precedence is `BREACHED > AT_RISK > ON_TRACK > MET`.

  Being pure is what makes this the only function the unit tests need to cover the whole matrix — **do not** let it read a repository.
- **`listPolicies(): Promise<PublicSlaPolicy[]>`** — joins `TicketPriority`, orders by `priority.sortOrder ASC`.
- **`upsertPolicy(priorityId, input, actorUserId): Promise<PublicSlaPolicy>`** — one transaction: find-or-create by `priorityId`, save, then `recordAudit(manager, { action: SLA_POLICY_UPDATED, entityType: SLA_POLICY, entityId, summary, details })`. Throws `NotFoundError('TicketPriority')` when the priority does not exist.
- **`policyMapByPriorityId(): Promise<Map<string, SlaPolicy>>`** — **one** query returning every active policy, keyed by `priorityId`. This is what keeps `listTickets` free of an N+1; there are at most four rows.

### 4 — Stamp the timestamps

Each edit goes **inside the existing transaction** and is guarded so the stamp is write-once.

**File: `backend-nodejs/src/modules/tickets/tickets.service.ts`**

- `assignTicket` (~lines 388–443): inside the transaction, before `manager.save(ticket)` (~line 407):
  ```ts
  // First response = the first time a human took ownership. Write-once: a
  // reassignment must not restart the response clock.
  if (newAssignedUserId && !ticket.firstRespondedAt) {
    ticket.firstRespondedAt = new Date();
  }
  ```
- `transitionTicket` (~lines 303–316): inside the transaction, before `manager.save(ticket)` (~line 306):
  ```ts
  if (!ticket.resolvedAt &&
      (toStatus.code === TICKET_STATUS_CODES.RESOLVED ||
       toStatus.code === TICKET_STATUS_CODES.CLOSED)) {
    ticket.resolvedAt = new Date();
  }
  ```
  A `RESOLVED → CLOSED` step therefore keeps the original `resolvedAt`, which is the honest reading of "when was this solved".

**File: `backend-nodejs/src/modules/tickets/ticketNotes.service.ts`**

In `createNote`, when `isInternal === false` and the ticket's `firstRespondedAt` is null, stamp it in the **same** transaction as the note insert. If `createNote` does not currently open a transaction, wrap the note save and the stamp in one `AppDataSource.transaction` — copy the shape from `transitionTicket` (~lines 303–316). **An internal note must not stamp anything**; assert that in the test plan.

### 5 — Project SLA onto ticket payloads

**File: `backend-nodejs/src/modules/tickets/tickets.service.ts`**

Add `firstRespondedAt`, `resolvedAt`, and `sla: SlaSnapshot | null` to `PublicTicket` (~lines 12–28) and to `toPublicTicket` (~lines 71–99).

`toPublicTicket` is synchronous and has no policy in hand, so give it an **optional second parameter**:

```ts
export function toPublicTicket(t: Ticket, policy?: SlaPolicy | null): PublicTicket
```

When the parameter is omitted, `sla` is `null`. Then:
- `listTickets` (~lines 162–205): call `policyMapByPriorityId()` **once**, after `getManyAndCount`, and map each row through `toPublicTicket(row, map.get(row.priorityId) ?? null)`.
- `findById`-based paths (`getOne`, `create`, `update`, `transition`, `assign` in `tickets.controller.ts`): fetch the single policy for that ticket's `priorityId`.

Add an SLA filter to `ListTicketsFilter` and `listTickets`: `slaStatus?: SlaStatus`. Because the status is computed rather than stored, **filter in memory after the projection** and document the consequence plainly in a comment — the `total` reflects the pre-filter count unless you also recount. Choose one and state it: apply the SLA filter **before** slicing by computing over the branch-scoped set, and set `total` to the filtered length. Note in the same comment that this makes `slaStatus` the one filter that reads the whole matching set rather than a page.

**File: `backend-nodejs/src/modules/tickets/tickets.schemas.ts`**

Add `slaStatus: z.enum(['ON_TRACK','AT_RISK','BREACHED','MET']).optional()` to `listTicketsQuerySchema` (~lines 25–39), and create:

```ts
export const upsertSlaPolicySchema = z.object({
  responseTargetMinutes: z.coerce.number().int().min(1).max(100000),
  resolutionTargetMinutes: z.coerce.number().int().min(1).max(100000),
  isActive: z.boolean().optional(),
}).refine(d => d.resolutionTargetMinutes >= d.responseTargetMinutes, {
  message: 'Resolution target must be at least the response target',
  path: ['resolutionTargetMinutes'],
});
```

Put it in a new `backend-nodejs/src/modules/sla/sla.schemas.ts` alongside `priorityIdParamSchema`, rather than growing `tickets.schemas.ts`.

### 6 — Escalation

**Create file: `backend-nodejs/src/modules/sla/slaEscalation.service.ts`**

```ts
/**
 * Rule-based, in-process escalation. Runs on the next write to a ticket — there
 * is no scheduler and no external notifier by design. The audit row and the
 * TicketHistory row ARE the notification.
 */
export async function escalateIfBreached(
  manager: EntityManager,
  ticket: Ticket,
  actorUserId: string,
): Promise<boolean>
```

Returns `true` when it escalated. Steps, all through the passed `manager`:
1. Load the policy for `ticket.priorityId`. Return `false` when absent or inactive.
2. `computeSla(ticket, policy)`. Return `false` unless `status === 'BREACHED'`.
3. Return `false` when the ticket's status code is `RESOLVED` or `CLOSED`.
4. Load the current priority; find the priority whose `sortOrder` is the **next higher** value. Return `false` when none exists — the ticket is already at the top.
5. Set `ticket.priorityId`, save, then write a `TICKET_HISTORY_ACTIONS.PRIORITY_CHANGED` history row and a `TICKET_PRIORITY_CHANGED` audit row, both with `note: 'SLA breach escalation'`.

Call it at the **end** of `transitionTicket`'s transaction (`tickets.service.ts` ~line 315) and at the end of `assignTicket`'s (~line 442), after the existing history writes. **Do not** call it from `updateTicket` — that path's `actorUserId` is the empty string (see Story 15, task 6), and passing it here would write an escalation row with no actor.

### 7 — Routes and controller

**Create file: `backend-nodejs/src/modules/sla/sla.controller.ts`** and **`sla.routes.ts`**, copying the `authenticate` + `authorize` + `validate` layering from `tickets.routes.ts` (~lines 24–39).

| Method | Path | Permission | Handler |
|---|---|---|---|
| `GET` | `/api/v1/sla/policies` | `tickets.read` | `listPolicies` |
| `PUT` | `/api/v1/sla/policies/:priorityId` | `sla.manage` | `upsertPolicy` |

Reading is gated on `tickets.read`, not `sla.manage`, so an Agent's ticket screen can show the target it is being held to.

**File: `backend-nodejs/src/routes/v1.ts`**

Add one line after the tickets mount (~line 15):

```ts
v1.use('/sla', slaRoutes);
```

**File: `backend-nodejs/src/modules/tickets/tickets.controller.ts`**

Extend `meta` (~lines 131–146) with a fourth parallel query returning the SLA policies, so a screen still primes itself with one request.

### 8 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

After the priorities loop (~lines 64–71), iterate `SLA_POLICY_DEFAULTS`, resolve each `priorityCode` to its `TicketPriority`, and insert the policy when absent. Guard with the same `if (!existing)` shape the file already uses so re-seeding is idempotent. Log one line per policy.

### 9 — Migration

**Create file: `backend-nodejs/src/database/migrations/1764000000000-SlaPolicies.ts`**

`up()`:
- `CREATE TABLE [SlaPolicies]` — `id`, `priorityId uniqueidentifier NOT NULL`, `responseTargetMinutes int NOT NULL`, `resolutionTargetMinutes int NOT NULL`, `isActive bit NOT NULL CONSTRAINT [DF_SlaPolicies_isActive] DEFAULT 1`, plus the three `BaseEntity` timestamps. FK `FK_SlaPolicies_priorityId → [TicketPriorities]([id]) ON DELETE NO ACTION`.
- `CREATE UNIQUE INDEX [UX_SlaPolicies_priorityId] ON [SlaPolicies]([priorityId])` — **not filtered**; `priorityId` is not null, so a plain unique index is correct here.
- `ALTER TABLE [Tickets] ADD [firstRespondedAt] datetime2 NULL`
- `ALTER TABLE [Tickets] ADD [resolvedAt] datetime2 NULL`
- `CREATE INDEX [IDX_Tickets_resolvedAt] ON [Tickets]([resolvedAt])` — the reporting queries in Story 19 filter on it.

`down()`: drop the index, both columns, then `DROP TABLE [SlaPolicies]`.

**Existing tickets get null stamps and are therefore evaluated as live clocks against their creation date.** Every demo ticket older than its resolution target will read `BREACHED` immediately after this migration. That is correct, not a bug — call it out in the migration comment.

---

## Edge Cases & Failure Modes

- **A priority with no policy row.** `computeSla` returns `null` and `sla` is `null` on the payload. No default is invented and no error is raised. Enforced at the top of `computeSla` in `sla.service.ts`.
- **A policy marked `isActive: false`.** Treated exactly like a missing policy. This is the switch for turning SLA off without deleting configuration.
- **`resolutionTargetMinutes < responseTargetMinutes`.** Rejected by the `.refine` on `upsertSlaPolicySchema` with a 422 pointing at `resolutionTargetMinutes`. Without the guard, every responded ticket would read `BREACHED` on resolution.
- **A ticket resolved before it was ever responded to** (created, then transitioned straight to `CLOSED`). `firstRespondedAt` stays null while `resolvedAt` is set. The response clock is evaluated as still running against a stopped ticket — treat a null `firstRespondedAt` on a resolved ticket as `BREACHED` for the response leg, and assert that case explicitly in the unit tests.
- **A reopen path.** `TICKET_TRANSITIONS` has no edge out of `CLOSED` (`ticket.constants.ts` ~line 49), so a reopen cannot happen today. The write-once guard on `resolvedAt` means that if a future story adds one, the original resolution time survives rather than being silently overwritten.
- **`RESOLVED → CLOSED`.** `resolvedAt` is already set, so the guard skips it. The ticket keeps the timestamp of the resolution, not of the closure.
- **An internal note as first response.** Deliberately does **not** stamp `firstRespondedAt`. The customer has heard nothing; the clock is still running. This is the single most likely misimplementation in the story — test it directly.
- **Escalation from the top priority.** `URGENT` has the highest `sortOrder` (3), so step 4 finds no higher row and returns `false`. Without this guard the lookup returns `undefined` and the save writes a null `priorityId`.
- **Escalation loops.** Each escalation is a real priority change, so the next write recomputes against the **new** priority's (shorter) targets and may escalate again — but only until the top. Bounded by the four priority rows. Note the bound in the service comment.
- **Escalation inside a rolled-back transaction.** It writes through the passed `manager`, so it rolls back with the transition or assignment that triggered it. There is no partially-escalated state.
- **Two concurrent writes both escalating.** Last commit wins on `priorityId`; both write history rows. The trail stays truthful and no data corrupts — the same trade-off Story 12 documented for concurrent transitions.
- **`slaStatus` filtering and pagination.** The status is computed, not indexed, so the filter is applied in memory over the branch-scoped result set before slicing. On a large table this reads more rows than a normal filter. Acceptable at this scale; the comment in `listTickets` must say so rather than leaving it to be discovered.
- **Clock skew between app and database.** All SLA maths uses the Node process clock (`new Date()`), never `GETDATE()`. Mixing them would make a ticket appear responded-to before it was created. Keep every comparison on one clock.
- **A ticket older than every target after the migration.** Reads `BREACHED` on the first request and escalates on its next write. Expected — the demo data is old.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/sla/__tests__/sla.compute.spec.ts`.** This is the story's main safety net; `computeSla` is pure, so cover the full matrix:
   - Policy null → returns `null`. Policy `isActive: false` → returns `null`.
   - Fresh ticket, 0 minutes elapsed → `ON_TRACK`, positive `minutesToResponseDue`.
   - 79 % of the response target elapsed → `ON_TRACK`; 80 % → `AT_RISK`; 101 % → `BREACHED`.
   - Both clocks stopped inside target → `MET`.
   - Response met but resolution breached → `BREACHED` (precedence).
   - Response breached but resolution still `ON_TRACK` → `BREACHED`.
   - Resolved ticket with null `firstRespondedAt` → `BREACHED`.
   - `responseDueAt` / `resolutionDueAt` are derived from `createdAt`, not from `now`.
   - `minutesToResponseDue` is `null` once `firstRespondedAt` is set, and negative when the deadline has passed on a live clock.
2. **Unit — create `backend-nodejs/src/modules/sla/__tests__/sla.schemas.spec.ts`.**
   - `upsertSlaPolicySchema` rejects `0` and negative minutes, and rejects `resolutionTargetMinutes < responseTargetMinutes` with the error on the right path.
   - `SLA_POLICY_DEFAULTS` covers exactly the four seeded priority codes and every entry satisfies `resolution >= response`.
3. **Integration — create `backend-nodejs/src/modules/sla/__tests__/slaPolicies.itest.ts`.**
   - `GET /api/v1/sla/policies` returns four rows ordered by `priority.sortOrder` and is callable with only `tickets.read`.
   - `PUT /api/v1/sla/policies/:priorityId` as Administrator returns 200 and writes one `SLA_POLICY_UPDATED` audit row.
   - The same call as an Agent returns **403**.
   - An unknown `priorityId` returns 404.
   - A payload with `resolutionTargetMinutes` below `responseTargetMinutes` returns 422.
4. **Integration — create `backend-nodejs/src/modules/sla/__tests__/slaStamps.itest.ts`.**
   - Assigning a ticket sets `firstRespondedAt`; reassigning does **not** change it.
   - A note with `isInternal: true` leaves `firstRespondedAt` null.
   - A note with `isInternal: false` sets it, and a second such note does not change it.
   - Transitioning to `RESOLVED` sets `resolvedAt`; the subsequent `RESOLVED → CLOSED` leaves it unchanged.
   - `GET /api/v1/tickets/:id` returns a populated `sla` object; a ticket whose priority has no policy returns `sla: null`.
   - `GET /api/v1/tickets?slaStatus=BREACHED` returns only breached tickets and a `total` matching the returned set.
5. **Integration — create `backend-nodejs/src/modules/sla/__tests__/slaEscalation.itest.ts`.**
   - A ticket created far enough in the past to breach, then transitioned, comes back one priority higher with a `PRIORITY_CHANGED` history row and a `TICKET_PRIORITY_CHANGED` audit row.
   - A ticket already at `URGENT` does **not** escalate and writes no extra rows.
   - A ticket at `CLOSED` does not escalate.
   - A ticket inside its target does not escalate.
6. **Regression:** re-run the Story 11–13 suites. `toPublicTicket` gained a parameter and three fields; every existing ticket assertion must still pass **unchanged**. If one fails, the payload changed in a way it should not have.

---

## Migration / Rollback

- Run `npm run migration:run` then `npm run db:seed` — the seed's policy rows need the table.
- Timestamp `1764000000000` follows Story 15's `1763000000000`. Story 17 takes `1765`, Story 20 takes `1766`.
- `down()` drops `SlaPolicies` and both `Tickets` columns. **The stamps are unrecoverable** — the first-response and resolution times are not derivable from `TicketHistory` for tickets created before Story 12, and only approximately for the rest.
- **Half-applied state:** if `up()` creates the table but fails before the `Tickets` columns, every SLA read throws on a missing column. Revert fully and re-run.
- Reverting this story while Story 19's reports are deployed breaks those queries — they read `resolvedAt`. Revert in reverse timestamp order.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Then `SELECT COUNT(*) FROM SlaPolicies` returns `4`.
4. **Unit tests:** `npm test` in `backend-nodejs/`.
5. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
6. **Backend runs:** `npm run dev` in `backend-nodejs/`, then with an admin token:
   - `GET /api/v1/sla/policies` → four rows, `LOW` first.
   - `GET /api/v1/tickets/<id>` → an `sla` object with a status and two due dates.
   - `PUT /api/v1/sla/policies/<urgent id>` with `{"responseTargetMinutes":15,"resolutionTargetMinutes":120}` → 200, then `SELECT TOP 1 * FROM AuditLogs ORDER BY createdAt DESC` shows `SLA_POLICY_UPDATED`.
   - `PATCH /api/v1/tickets/<old ticket id>/status` → 200, and the response shows a higher priority than before.
   - `GET /api/v1/tickets?slaStatus=BREACHED` → only breached tickets.
7. **Permission check:** sign in as `agent@azm.local` — `GET /api/v1/sla/policies` succeeds, `PUT` returns 403.
8. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `SlaPolicies` exists with a **unique** `priorityId` and an `isActive` flag.
- [ ] `Tickets.firstRespondedAt` and `Tickets.resolvedAt` exist, are nullable, and are indexed where the reports need them.
- [ ] `computeSla` is pure, takes no repository, and returns `null` for a missing or inactive policy.
- [ ] The four states resolve exactly as the unit matrix specifies, with resolution outranking response.
- [ ] `AT_RISK` fires at exactly 80 % of the target.
- [ ] Assignment stamps `firstRespondedAt` once; reassignment never restamps.
- [ ] A customer-visible note stamps first response; an **internal** note does not.
- [ ] `RESOLVED` and `CLOSED` both stamp `resolvedAt`, and the second one never overwrites the first.
- [ ] Every ticket payload carries `sla`, `firstRespondedAt`, and `resolvedAt`.
- [ ] `listTickets` computes SLA with **one** policy query, not one per row.
- [ ] `GET /tickets?slaStatus=` filters, and its `total` matches the filtered set.
- [ ] `GET /api/v1/sla/policies` needs only `tickets.read`; `PUT` needs `sla.manage`.
- [ ] A policy update writes one `SLA_POLICY_UPDATED` audit row.
- [ ] Escalation moves a breached, non-terminal ticket up exactly one priority, writes both a history and an audit row, and stops at the top priority.
- [ ] Escalation is never called from `updateTicket`.
- [ ] The seed creates four policies and is idempotent.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 17.**
