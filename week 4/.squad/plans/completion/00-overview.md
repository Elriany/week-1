# completion — plan overview

Entry point for the **completion** feature. Stories execute in order by their `NN` prefix.

Covers Azure DevOps work item **27 — US13 Essential CRM Completion & Integrated User Experience**. The work item's ten implementation tasks are split across nine stories so each one is independently shippable and verifiable. Stories 15–20 are backend-only; Stories 21–23 are frontend-only, with Story 23 carrying the end-to-end verification and the duplication sweep.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 15 | [15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md) | CRM Foundation: Channel, Customer Account Link & Audit Log | 27 | Story 07 (auth, permissions), Stories 11–13 (ticket module) |
| 16 | [16-story-sla-configuration-and-status-27.md](16-story-sla-configuration-and-status-27.md) | Simplified SLA Configuration & Ticket SLA Status | 27 | Story 15 |
| 17 | [17-story-knowledge-base-backend-27.md](17-story-knowledge-base-backend-27.md) | Knowledge Base & FAQ Backend | 27 | Story 15, Story 08 (search/page pattern) |
| 18 | [18-story-customer-self-service-backend-27.md](18-story-customer-self-service-backend-27.md) | Customer Self-Service Backend & Support Web Form | 27 | Stories 15, 16, 17 |
| 19 | [19-story-dashboard-and-reporting-apis-27.md](19-story-dashboard-and-reporting-apis-27.md) | Agent Dashboard & Management Reporting APIs | 27 | Stories 15, 16 |
| 20 | [20-story-administration-apis-27.md](20-story-administration-apis-27.md) | Basic Administration APIs | 27 | Stories 15, 18, 19 |
| 21 | [21-story-agent-workspace-and-management-dashboard-27.md](21-story-agent-workspace-and-management-dashboard-27.md) | Agent Workspace & Management Dashboard Screens | 27 | Stories 16, 19, Story 14 (screen patterns) |
| 22 | [22-story-knowledge-base-and-customer-portal-screens-27.md](22-story-knowledge-base-and-customer-portal-screens-27.md) | Knowledge Base & Customer Portal Screens | 27 | Stories 17, 18, 21 |
| 23 | [23-story-administration-screens-and-end-to-end-flow-27.md](23-story-administration-screens-and-end-to-end-flow-27.md) | Administration Screens, Audit Viewer & End-to-End Flow | 27 | Stories 19, 20, 21, 22 |

## Work item task coverage

| Work item task | Story |
|---|---|
| 1. Agent workspace & dashboard | 19 (APIs) + 21 (screens) |
| 2. Customer communication (web form, channel) | 15 (`channel` column, `TICKET_CHANNELS`) + 18 (form endpoint) + 22 (form screen) |
| 3. Knowledge Base / FAQ | 17 (backend) + 22 (screens, including the ticket-workspace panel) |
| 4. Customer self-service | 15 (`Users.customerId`) + 18 (portal APIs) + 22 (portal screens) |
| 5. Simplified SLA & automation | 16 (config, calculation, escalation) + 21 (badges, filter) + 23 (policy editor) |
| 6. Reports & management view | 19 (APIs) + 21 (screens) |
| 7. Basic administration | 20 (APIs) + 23 (screens) |
| 8. Basic auditability | 15 (table, service, ticket wiring) + 19 (read endpoint) + 23 (viewer) |
| 9. Integration readiness without external services | 15 (channel is a stored value, not a transport) + every story's out-of-scope list |
| 10. Module integration & end-to-end flow | 22 (shared ticket child components) + 23 (cross-links, duplication sweep, nine-step E2E scenario) |

## Dependency notes

- **Story 15 is the shared-contract story. Every permission code used by the feature is introduced there and nowhere else** — `kb.read`, `kb.manage`, `reports.read`, `admin.manage`, `audit.read`, `sla.manage`, plus `tickets.create` and `kb.read` for the `CUSTOMER` role. Any edit to `permissions.constants.ts` requires a re-run of `npm run db:seed`. Stories 16–23 add **no** permission codes.
- **`AUDIT_ENTITY_TYPES` has exactly one documented exception to that rule:** Story 20 adds `USER: 'User'` for the customer-link audit row, because Story 15's list has no user member. That addition must be called out in its commit.
- **The integration suite does not currently run.** All seven `.itest.ts` files import `{ app }` from `app.ts`, which only has a default export — so `supertest` receives `undefined`. Story 15, task 1 adds the named export. **Expect real, previously-hidden failures on the first successful `npm run test:integration`** and budget for fixing them inside Story 15.
- **`Users.customerId` is the hinge of the whole customer-facing half of the feature.** It is nullable with a **filtered** unique index (`WHERE [customerId] IS NOT NULL`) — without the filter, the second staff user fails to save. Story 18 fails **closed** on a null value: an unlinked account gets 403 from every portal route, never an empty list that would read as "you have no tickets". Story 20 makes linking an API operation; Story 23 makes it a screen.
- **The `Departments` schema contradicts itself and Story 20 resolves it.** `department.entity.ts` declares both a global unique index on `['code']` and a composite unique index on `['branchId','code']`. The global one wins and prevents the same department code existing in two branches — which collides with Story 18's `SUPPORT`-per-branch seed. Story 20's migration drops the global unique index and keeps the composite. **If Story 18's seed fails, this is the fix, and the two stories must land in order.**
- **`resolveIntakeDepartment` is the only new SQL query Story 18 is allowed to write.** Every other portal endpoint delegates to an existing service function. A second copy of a ticket query in that story is a defect.
- **SLA is computed on read, never stored.** `computeSla` is pure and takes no repository, which is what lets one unit test cover the whole state matrix. `listTickets` fetches the four policies in **one** query via `policyMapByPriorityId()`; a per-row policy lookup is the N+1 this design exists to prevent. Story 19's SLA bucket counts are the **single documented exception** to its "count in SQL" rule, and the exception is annotated in code.
- **Targets are wall-clock minutes, not business hours.** Stated in `sla.constants.ts`, in the SLA card (Story 21), and on the policy editor (Story 23) so a manager sees the same fact wherever they act on it.
- **The response clock stops on an assignment or a *customer-visible* note — never an internal one.** That distinction is the most likely misimplementation in Story 16 and is tested directly. The same `isInternal` flag guards three separate read paths (the notes list, the history merge, and the portal), and a fix applied to one and not the others is the predictable regression.
- **Ticket statuses are rename-only, in every layer.** `TICKET_TRANSITIONS` is keyed by status **code** and lives in source (`ticket.constants.ts`), so a created status has no graph entry and any ticket set to it is permanently stuck. Story 20 refuses create and deactivate in the service; Story 23 omits the controls from the template rather than disabling them. `TicketStatuses` deliberately gains **no** `isActive` column.
- **Reference codes are immutable everywhere.** `code` is absent from every update input **type**, not merely validated away, because codes appear in `TICKET_TRANSITIONS`, in seeds, and in already-written `TicketHistory.fromValue` / `toValue` strings.
- **Deactivation is the only removal mechanism for reference data.** Branches and departments refuse deactivation while they hold active users or open tickets; priorities refuse it while an active SLA policy points at them. Categories deactivate freely — existing tickets keep displaying them, they just stop being offered. Story 20's change to `GET /tickets/meta` (active-only) is the one behaviour change in that story with regression potential for the Story 14 screens.
- **Migration timestamps are pre-assigned and must stay ordered:** `1763000000000` (Story 15) → `1764000000000` (16) → `1765000000000` (17) → `1766000000000` (19) → `1767000000000` (20). Stories 18, 21, 22, and 23 add no migration. Revert in reverse order. **Story 20's `down()` is the one non-mechanical revert in the feature** — restoring the global unique index on `Departments.code` fails if two branches now share a code, and requires manual deduplication first.
- **Before writing Story 19's migration, confirm `IDX_Tickets_branchId_statusId` (Story 11) and `IDX_Tickets_resolvedAt` (Story 16) already exist.** Recreating either fails on a duplicate index name. Before writing Story 20's, query `sys.indexes` for the real generated name of the `Departments.code` index — a guessed name fails the whole migration.
- **Every dashboard and report bucket carries a `filter` object whose keys are valid `GET /tickets` query parameters,** asserted against `listTicketsQuerySchema` by a Story 19 unit test and end-to-end by a Story 21 component test. Story 21's views spread that object **verbatim**; re-keying it is what makes a tile and its list silently disagree. The uncategorised bucket carries an **empty** filter and renders as non-clickable text, because `GET /tickets` has no "category is null" predicate.
- **A `CUSTOMER` holds `tickets.read`, so the staff ticket routes were reachable by URL.** Story 22 closes that with a router-level redirect and records in the code comment that the durable fix is a distinct backend permission for the staff list, deliberately not attempted in a frontend-only story.
- **Hidden content returns 404, never 403, in three places** — a draft KB article (Story 17), another customer's ticket (Story 18), and their child resources. A 403 would let a caller probe for existence. The screens mirror this by rendering not-found rather than a permission message.
- **`v-html` appears nowhere in the frontend, before or after this feature.** KB article bodies are author-supplied and there is no sanitiser; they render as text in a `pre-wrap` block. Stories 22 and 23 both verify this by grep and by test.
- **No charting library is added.** Story 21 renders every breakdown as a table plus CSS bar rows using `inlineSize` so they mirror correctly in Arabic.
- **Story 22 extracts the ticket notes, attachments, and timeline into shared components** used by both the staff and portal detail screens. `TicketDetailView.spec.ts` must pass **unchanged** afterwards — the same acceptance test Story 13 used for the uploader refactor. Story 23's cleanup pass applies the identical rule to the `messageFor` and `/tickets/meta` consolidations.
- **`en.json` and `ar.json` must stay at identical key sets with no empty Arabic value** — `locale-parity.spec.ts` enforces both. Story 21's removal of the placeholder dashboard keys is the one risky edit: remove a key from **both** files or neither.
- **No external service, transport, queue, or scheduler is introduced anywhere in the feature.** The ticket `channel` is a stored string. Escalation is rule-based and fires on the next write to a ticket, with the audit row and the history row serving as the notification. SLA status is computed on read. Every story's out-of-scope list states this explicitly so a later reader does not mistake an omission for an oversight.
