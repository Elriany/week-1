# ticket — plan overview

Entry point for the **ticket** feature. Stories execute in order by their `NN` prefix.

Covers Azure DevOps work item **18 — US04 Ticket Management & Lifecycle**. The work item's eleven implementation tasks are split across four stories so each one is independently shippable and verifiable. Stories 11–13 are backend-only; Story 14 is frontend-only.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 11 | [11-story-ticket-data-model-creation-and-search-18.md](11-story-ticket-data-model-creation-and-search-18.md) | Ticket Data Model, Creation & Search | 18 | Story 08 (service/controller pattern), Story 07 (auth, permissions, branch scoping) |
| 12 | [12-story-ticket-lifecycle-assignment-and-history-18.md](12-story-ticket-lifecycle-assignment-and-history-18.md) | Ticket Lifecycle, Assignment & History Auditing | 18 | Story 11 |
| 13 | [13-story-ticket-notes-and-attachments-18.md](13-story-ticket-notes-and-attachments-18.md) | Ticket Notes & Attachments | 18 | Story 12, Story 10 (upload infrastructure) |
| 14 | [14-story-ticket-screens-and-lifecycle-actions-18.md](14-story-ticket-screens-and-lifecycle-actions-18.md) | Ticket Screens & Lifecycle Actions | 18 | Story 13 |

## Work item task coverage

| Work item task | Story |
|---|---|
| 1. Ticket, category, priority, status, assignment and history data model | 11 (category, status alignment) + 12 (assignment, history) |
| 2. Ticket creation and unique ticket numbering | 11 |
| 3. Ticket lifecycle and status transitions | 12 |
| 4. Ticket assignment and reassignment | 12 |
| 5. Ticket notes and attachments | 13 |
| 6. Ticket history auditing | 12 (audit rows) + 13 (notes/attachments folded into the timeline) |
| 7. Ticket search, filtering and sorting | 11 |
| 8. Ticket list and filters | 14 |
| 9. Ticket creation form | 14 |
| 10. Ticket details and lifecycle actions | 14 |
| 11. Test ticket lifecycle, assignment and history | 11–14 (each story carries its own Test Plan) |

## Dependency notes

- **Four ticket tables already exist.** Story 02's migration `1724086800000-InitialCrmSchema.ts` created `TicketStatuses`, `TicketPriorities`, `Tickets` (~lines 128–159), and `TicketComments` (~lines 161–177), and four entities under `backend-nodejs/src/modules/tickets/` are already mapped to them. **No story recreates these tables.** Story 11 extends `Tickets` with a nullable `categoryId`; Story 13 wires up the dormant `TicketComments` table rather than adding a second one.
- **The seeded status codes did not match the acceptance criteria.** Story 02 seeded `NEW`, `OPEN`, `PENDING`, `RESOLVED`, `CLOSED`; the work item requires New, **Assigned**, **In Progress**, **Pending Customer**, Resolved, Closed. Story 11's migration adds the three missing codes, remaps any ticket using `OPEN`/`PENDING`, and deletes those two rows. **This is the only destructive reference-data change in the feature** — see Story 11's Migration / Rollback section before running it against data that matters.
- **`ar.json` had `ticket.status.RESOLVED` set to `"مغلق"`** ("closed"), duplicating `CLOSED`. Story 11 corrects it to `"تم الحل"` as part of the same status alignment.
- **Permission codes are introduced once, in Story 11.** `tickets.read` / `tickets.create` / `tickets.update` already existed; Story 11 adds only `tickets.assign` (Manager, Supervisor, Administrator) and grants `tickets.create` to Agent. Stories 12–14 add none — notes, attachments, and history all reuse `tickets.read` / `tickets.update`. Any edit to `permissions.constants.ts` requires a re-run of `npm run db:seed`.
- **The permission split is deliberate:** transitions need `tickets.update`, assignment needs `tickets.assign`. An Agent can work their own ticket but cannot route work to someone else. Story 14's UI mirrors this by not rendering the assignee control for that role.
- **Branch scoping is inherited, not re-invented.** Story 11 copies `isUnscoped()` from `customers.controller.ts`; Story 12 factors it into an exported `requireTicketInScope()`; Story 13 reuses that helper unchanged — the same progression Stories 08→09→10 followed.
- **Story 13 is the only story that touches shared code.** It relocates `attachments.upload.ts` from `modules/customers/` to `common/uploads/` and parameterises it by scope so one hardened uploader serves both features. **This changes the on-disk layout** (`<root>/<id>/` → `<root>/customers/<id>/`) and requires a one-time directory move documented in that story. The customer test suite must pass **unmodified** afterwards — that is the check that the refactor preserved behaviour.
- **Story 13 adds no new dependency and no new env var.** `multer`, `UPLOAD_DIR`, and `MAX_UPLOAD_BYTES` all arrived with Story 10.
- **Story 12's history table is the audit trail; Story 13 widens it into a timeline.** `listHistory` starts reading one table and ends up merging audit rows, notes, and attachments — the same merge-and-slice approach `customerHistory.service.ts` already uses, including the same documented pagination trade-off.
- **`Tickets.customerId` already references `Customers.id`,** and `customerHistory.service.ts` (~lines 28–45) already reads it. Every story here must keep that query compiling; Story 14 closes the loop by making those timeline entries link to the new ticket detail route.
- **Internal notes are guarded in exactly two places** — the notes list and the history merge, both in Story 13, both driven by the same `includeInternal` flag. A fix applied to one and not the other is the predictable regression; both are tested.
- Migration timestamps are pre-assigned and must stay ordered: `1760000000000` (11) → `1761000000000` (12) → `1762000000000` (13). Story 14 adds no migration. Revert in reverse order.
