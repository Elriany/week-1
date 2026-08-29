# Story 25 — Dead Code Removal & Duplication Sweep (Story: 28)

## Prerequisites

- **Story 24 completed** ([24-story-build-and-test-baseline-28.md](24-story-build-and-test-baseline-28.md)) — both projects build, all tests pass, lint is green. **Every deletion in this story is verified by re-running that gate**, so it has to be green first.
- **Story 24 created `frontend-vuejs/src/types/ui.ts`** exporting `BadgeVariant`. Task 6 below imports it.

---

## Story Goal

Work item task 3 ("Code Simplification & Cleanup"), executed against a specific, verified list rather than a general instruction:

1. **Delete the Vite scaffold remnants** — nine files that no route and no component reaches.
2. **Delete one duplicated backend module** — `modules/customers/attachments.upload.ts`, a 65-line copy of the shared uploader that nothing imports.
3. **Delete two backend exports kept "for backward compatibility"** that only their own test references.
4. **Consolidate the two identical ticket badge-variant helper pairs** into one module.
5. **Bring `CustomerDetailView.vue` onto `useApiError`** — it is the only view left with the error branch written out by hand, eight times.
6. **Move the three inline handlers out of `customers.routes.ts`**, removing a dynamic `import()` that runs on every request.
7. **Remove the unreferenced stylesheet** and stop the scaffold theme file from fighting the design tokens.

**Not in scope:**
- Any behaviour change. Every deletion is of something unreachable; every consolidation must leave the existing tests passing **unchanged**.
- Deleting i18n keys. Many are built by interpolation and a naive sweep breaks them — see Edge Cases. Story 27 handles the ones tied to screens it removes.
- The `AboutView.vue` route. Story 27 owns navigation and deletes it there.
- Restyling anything. Story 26 owns the design system; this story only deletes `src/assets/styles/main.css`, which nothing imports.

---

## Context — Read These Files First

1. `frontend-vuejs/src/router/index.ts` — the `routes` array, **lines 15–136**. Confirm for yourself that no route references `HomeView.vue`. The only scaffold-era route left is `about` at **lines 122–127**, which Story 27 removes.
2. `frontend-vuejs/src/components/TheWelcome.vue` — the only importer of `WelcomeItem.vue` and all five files in `src/components/icons/`. `HomeView.vue` is the only importer of `TheWelcome.vue`, and nothing imports `HomeView.vue`.
3. `frontend-vuejs/src/main.ts` — **line 1**, `import './assets/main.css'`. The single stylesheet entry point.
4. `frontend-vuejs/src/assets/main.css` — **line 1** is `@import './base.css'`; **lines 4–56** define the design tokens. `src/assets/styles/main.css` (125 lines) is **imported by nothing**.
5. `backend-nodejs/src/modules/customers/attachments.upload.ts` — the **whole file** (65 lines). Compare with `backend-nodejs/src/common/uploads/attachments.upload.ts`, which is the version every module actually imports.
6. `backend-nodejs/src/common/uploads/attachments.upload.ts` — **lines 100–112**, the two exports marked `Deprecated: … Kept for backward compatibility with existing imports.` There are no such imports.
7. `backend-nodejs/src/common/uploads/__tests__/attachments.upload.spec.ts` — **lines 3, 38–50, 61**. The only referencer of `customerDir` and `handleUpload`; its own describe block is titled `customerDir (backward compatibility)`.
8. `frontend-vuejs/src/views/TicketsView.vue` — **lines 408–427**, `getPriorityVariant` and `getStatusVariant`.
9. `frontend-vuejs/src/views/TicketDetailView.vue` — **lines 552–571**. Byte-identical to the pair above.
10. `frontend-vuejs/src/composables/useApiError.ts` — the **whole file** (26 lines). `messageFor(err, overrides)` plus the `ApiErrorOverrides` type.
11. `frontend-vuejs/src/views/CustomersView.vue` — **lines 220–228**. The idiomatic adoption: an `ERROR_OVERRIDES` constant and a three-line local `messageFor` wrapper. `UsersView.vue:239` and `TicketsView.vue:431` follow the same shape. **These wrappers are not duplication — do not remove them.**
12. `frontend-vuejs/src/views/CustomerDetailView.vue` — **lines 303 (the `ApiError` import), 429–437, and the eight one-line ternaries at 453, 466, 487, 513, 532, 553, 572**. The one view that never adopted the composable.
13. `backend-nodejs/src/modules/customers/customers.routes.ts` — **~lines 474–491**, **~517–534**, **~642–658**. Three inline handlers, each opening with `const { requireCustomerInScope } = await import('./customerChildren.controller');`.
14. `backend-nodejs/src/modules/customers/customerChildren.controller.ts` — the exported controller object and `requireCustomerInScope`. The three handlers above belong here.
15. [../completion/23-story-administration-screens-and-end-to-end-flow-27.md](../completion/23-story-administration-screens-and-end-to-end-flow-27.md) — its closing cleanup pass established the rule this story follows: **a consolidation must leave every existing test passing unchanged.**

Grep targets, to be re-run **after** each deletion:
- `grep -rn "HelloWorld\|TheWelcome\|WelcomeItem\|IconCommunity\|IconDocumentation\|IconEcosystem\|IconSupport\|IconTooling\|HomeView\|stores/counter" frontend-vuejs/src/`
- `grep -rn "attachments.upload" backend-nodejs/src/`
- `grep -rn "handleUpload\b\|customerDir\b" backend-nodejs/src/`
- `grep -rn "getPriorityVariant\|getStatusVariant" frontend-vuejs/src/`

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Delete, do not comment out** | A commented-out block is dead code that survived the sweep. Git holds the history. |
| **One deletion per commit group** | Frontend scaffold, backend upload duplicate, deprecated exports, each consolidation. A single "cleanup" commit makes a bisect useless when something breaks. |
| **Existing tests pass unchanged** | The one exception is `attachments.upload.spec.ts`, which tests the two deleted exports by name. Its other blocks stay untouched. |
| **Thin per-view wrappers stay** | `messageFor(err) => messageForBase(err, ERROR_OVERRIDES)` is the project's idiom for per-view 409/422 text. Three views use it. It is not duplication. |
| **Nothing new is abstracted** | The work item forbids introducing patterns. The consolidations below each collapse two identical copies into one file — no base classes, no registries, no plugins. |
| **i18n keys are not swept** | See Edge Cases. |

---

## Frontend Tasks

### 1 — Delete the Vite scaffold remnants

**Delete these nine files:**

```
frontend-vuejs/src/components/HelloWorld.vue
frontend-vuejs/src/components/TheWelcome.vue
frontend-vuejs/src/components/WelcomeItem.vue
frontend-vuejs/src/components/icons/IconCommunity.vue
frontend-vuejs/src/components/icons/IconDocumentation.vue
frontend-vuejs/src/components/icons/IconEcosystem.vue
frontend-vuejs/src/components/icons/IconSupport.vue
frontend-vuejs/src/components/icons/IconTooling.vue
frontend-vuejs/src/views/HomeView.vue
```

Reference chain, verified: nothing imports `HelloWorld.vue`; nothing imports `HomeView.vue`; `HomeView.vue` is the sole importer of `TheWelcome.vue`; `TheWelcome.vue` is the sole importer of `WelcomeItem.vue` and all five icons. Removing the head of the chain frees the rest.

**Also delete** `frontend-vuejs/src/components/__tests__/HelloWorld.spec.ts` — it tests a deleted component.

**Also delete** `frontend-vuejs/src/stores/counter.ts` — the scaffold's example Pinia store, referenced by nothing.

Then delete `src/components/icons/` if the directory is now empty.

### 2 — Delete the orphan stylesheet

**Delete `frontend-vuejs/src/assets/styles/main.css`** (125 lines). `src/main.ts` imports `./assets/main.css`; nothing imports `./assets/styles/main.css`, and no `@import` references it. Two files with the same basename, one of them live, is a trap for the next reader.

Delete `src/assets/styles/` if it is then empty.

**Do not touch `src/assets/base.css` in this story.** It is live via `main.css:1`, and its `@media (prefers-color-scheme: dark)` block at lines 39–51 is a real problem — **Story 26 owns it.**

### 3 — Consolidate the ticket badge-variant helpers

`TicketsView.vue:408–427` and `TicketDetailView.vue:552–571` are byte-identical: a four-entry priority map and a six-entry status map, each falling back to `'gray'`.

**Create file: `frontend-vuejs/src/composables/useTicketBadges.ts`**

```ts
import type { BadgeVariant } from '@/types/ui'

/**
 * Ticket status and priority codes are fixed in `ticket.constants.ts` on the
 * server and are rename-only (Story 20), so mapping them to a badge variant is
 * a lookup, not configuration. One copy, so the tickets list and the ticket
 * detail screen can never colour the same ticket differently.
 */
const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success',
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  NEW: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  PENDING_CUSTOMER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'gray',
}

export function priorityVariant(code?: string): BadgeVariant {
  return PRIORITY_VARIANTS[code ?? ''] ?? 'gray'
}

export function statusVariant(code?: string): BadgeVariant {
  return STATUS_VARIANTS[code ?? ''] ?? 'gray'
}
```

Plain exported functions, not a `use*()` factory — neither helper needs reactivity or an injected dependency, and wrapping them in a composable would be the "unnecessary abstraction" the work item names. **Rename the file to `ticketBadges.ts` and place it in `src/composables/` alongside the others** so the import path stays predictable.

**File: `frontend-vuejs/src/views/TicketsView.vue`** — delete lines 408–427, import the two functions, and rename the two call sites at lines 164 and 170.

**File: `frontend-vuejs/src/views/TicketDetailView.vue`** — delete lines 552–571, same import, call sites at lines 43 and 52.

Also check `PortalTicketsView.vue` and `PortalTicketDetailView.vue` for a third copy before finishing — if either maps a status or priority to a variant inline, point it at the same module.

### 4 — Stop calling `useLocalizedName()` inside templates

**File: `frontend-vuejs/src/views/TicketsView.vue`** — lines 165 and 171.

**File: `frontend-vuejs/src/views/TicketDetailView.vue`** — lines 44, 53, and 196.

Both files already hold a `localizedName` from `useLocalizedName()` at setup — `TicketsView.vue:405` uses it. The five template call sites re-invoke the composable (and therefore `useI18n()`) **on every render, once per table row**. Replace each `useLocalizedName()(x)` with `localizedName(x)`.

This is a behaviour-preserving edit; `TicketsView.spec.ts` and `TicketDetailView.spec.ts` must pass unchanged.

### 5 — Bring `CustomerDetailView.vue` onto `useApiError`

`CustomerDetailView.vue` is the only view that never adopted the composable. It repeats

```ts
err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
```

verbatim at lines **453, 466, 487, 513, 532, 553, and 572**, plus the four-branch block at 429–437.

**File: `frontend-vuejs/src/views/CustomerDetailView.vue`**

- Import `useApiError` and take `messageFor` from it, matching `CustomersView.vue:220–228`. This view needs no per-view overrides today, so no `ERROR_OVERRIDES` constant and no local wrapper — call `messageFor` directly.
- Replace each of the seven ternaries with `messageFor(err)`.
- **Keep the block at 429–437 as it is.** The 404 and 403 branches set `notFound` / `forbidden`, which drive dedicated template states at lines 7–16 — a message string cannot replace them. Only its `else` branch (line 431's fallthrough) becomes `loadError.value = messageFor(err)`.
- The `ApiError` import at line 303 stays; the block above still needs it.

`CustomerDetailView.spec.ts` must pass unchanged after Story 24's fixture repair.

---

## Backend Tasks

### 6 — Delete the duplicated upload module

**Delete `backend-nodejs/src/modules/customers/attachments.upload.ts`** (65 lines).

It exports `UPLOAD_ROOT`, `customerDir`, and `handleUpload` — a narrower copy of `common/uploads/attachments.upload.ts`. **No file imports it.** Verified: every `attachments.upload` import in the tree resolves to `common/uploads/` —

```
src/modules/customers/customerAttachments.service.ts:7
src/modules/customers/customers.routes.ts:21
src/modules/portal/portal.controller.ts:11
src/modules/tickets/ticketAttachments.service.ts:7
src/modules/tickets/ticketChildren.controller.ts:4
src/modules/tickets/tickets.routes.ts:8
src/common/uploads/__tests__/attachments.upload.spec.ts:3
```

### 7 — Delete the two "backward compatibility" exports

**File: `backend-nodejs/src/common/uploads/attachments.upload.ts`** — delete **lines 100–112**:

- `handleUpload` — a third alias for `wrapMulter(customerUploader)`, identical to `handleCustomerUpload`.
- `customerDir(customerId)` — a one-line forwarder to `ownerDir('customers', customerId)`.

Both comments claim they are "kept for backward compatibility with existing imports." **There are no existing imports.** The only referencer is the module's own spec.

**File: `backend-nodejs/src/common/uploads/__tests__/attachments.upload.spec.ts`** — remove `customerDir` and `handleUpload` from the import on line 3, delete the `customerDir (backward compatibility)` describe block (lines ~38–50) and the `should export handleUpload for backward compatibility` case (~line 61).

The two deleted cases assert path traversal is rejected (`expect(() => customerDir(maliciousId)).toThrow(ValidationError)`). **That assertion must not be lost** — confirm the surviving `ownerDir` block covers the same traversal input; if it does not, move the traversal case onto `ownerDir` rather than deleting it. Traversal protection is the one thing in that file worth a test.

### 8 — Move the three inline handlers into the controller

**File: `backend-nodejs/src/modules/customers/customers.routes.ts`**

Three routes carry their handler inline instead of delegating to a controller, unlike every other route in the file and every other module:

| Route | Approx. lines | Handler |
|---|---|---|
| `GET /:id/attachments` | 474–491 | list attachments |
| `POST /:id/attachments` | 517–534 | upload attachment |
| `GET /:id/history` | 642–658 | paged interaction history |

Each begins with:

```ts
const { requireCustomerInScope } = await import('./customerChildren.controller');
```

A **dynamic `import()` evaluated inside the request handler, on every request**. `customerChildren.controller.ts` is already loaded — line 231 of this same file imports `customerChildrenController` statically — so the dynamic form buys nothing and costs a module-registry lookup per call.

**File: `backend-nodejs/src/modules/customers/customerChildren.controller.ts`**

Add three handlers to the exported controller object, in the `(async … ) as RequestHandler` shape Story 24 established:

```ts
listAttachments: (async (req, res, next) => {
  try {
    await requireCustomerInScope(req);
    const result = await listAttachments(req.params.id);
    return res.json({ success: true, data: result, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}) as RequestHandler,
```

`requireCustomerInScope` is defined in this file, so the dynamic import disappears entirely.

For **`POST /:id/attachments`**, carry over the missing-file check but **correct its status**. Today it throws `NotFoundError('No file uploaded')`, which returns **404** — the wrong code for a malformed request body, and one that a client reasonably reads as "customer not found". Use:

```ts
if (!req.file) throw new ValidationError({ file: 'A file is required' });
```

`ValidationError` returns **422** with a `details` object, matching how every other input failure in the API reports (`AppError.ts:18–20`). This is the work item's task 4, "standardize API error responses".

For **`GET /:id/history`**, the inline handler parses paging by hand:

```ts
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
```

Every other paged endpoint validates paging through a Zod schema in `validate({ query: … })`. Add a `customerHistoryQuerySchema` to `customerChildren.schemas.ts` modelled on `listCustomersQuerySchema` in `customers.schemas.ts`, wire it into the route's `validate({ params, query })`, and let the controller read the coerced values. **Keep the same bounds — default 20, max 100, minimum 1** — so the endpoint's behaviour is unchanged for every valid input.

Then reduce each route in `customers.routes.ts` to the one-line delegating form used at lines 66, 86, 231, and 359, leaving the OpenAPI comment block above it untouched.

---

## Edge Cases & Failure Modes

- **Deleting `HomeView.vue` while a route still points at it.** Verified today that none does, but re-run the grep after Story 27 lands, since that story edits the same routes array. A `component: () => import(...)` of a missing file fails **at navigation, not at build** — `vue-tsc` will not catch it.
- **i18n keys must not be swept mechanically.** A literal-reference scan reports 91 unreferenced keys, but many are built by interpolation — `audit.action.${row.action}`, `tickets.status.${code}`, `portal.priority.${code}`, `customers.history.kind.${kind}`. Deleting those breaks the screen silently, showing the raw key. **Before removing any key, grep for its parent prefix as a string** (`grep -rn "audit.action." frontend-vuejs/src/`). This story removes **no** i18n keys.
- **`customers.attachments.*` and `customers.history.*` look dead but are not junk.** Those 23 keys, in both locale files, belong to a backend feature with no UI — see [28-story-integration-security-and-final-verification-28.md](28-story-integration-security-and-final-verification-28.md), which wires the screens up. **Do not delete them here.**
- **Consolidating the badge helpers can change a colour.** The two copies are identical today; diff them before deleting either, and if they have drifted, the **tickets list** version wins — it is the one a user sees most.
- **`priorityVariant` returns `'gray'` for an unknown code.** A priority created through the admin screen has no entry in the map. That is correct and deliberate: a grey badge with the priority's real name is better than a crash or a misleading colour. Story 26 adds the non-colour cue that makes grey readable.
- **Deleting `handleUpload` breaks nothing at compile time and everything at runtime if a route used it.** Re-run `grep -rn "handleUpload\b" backend-nodejs/src/` **after** the delete, and re-run `npm run build`. An Express route registered with `undefined` middleware throws at startup, not at import.
- **The `NotFoundError` → `ValidationError` change on upload is a status-code change: 404 → 422.** `frontend-vuejs` has no customer-attachment UI today, so nothing consumes it — but the integration test `customers.itest.ts` may. Check it before committing.
- **`await import()` removal changes module load order.** `customerChildren.controller.ts` imports services that import `data-source.ts`. It is already imported statically at `customers.routes.ts:231`, so the order does not change — but if `npm run dev` starts throwing a TypeORM "connection not established" error after this task, the dynamic import was masking an initialisation-order problem and that is the real bug to fix.
- **`useLocalizedName()` in a template does currently work.** Vue sets the current instance during render, so `useI18n()` resolves. Task 4 is a cost and clarity fix, not a crash fix — do not describe it in the commit as fixing an error.

---

## Test Plan

1. **Delete** `frontend-vuejs/src/components/__tests__/HelloWorld.spec.ts` — its subject is gone.
2. **Modify** `backend-nodejs/src/common/uploads/__tests__/attachments.upload.spec.ts` — drop the two deleted-export blocks per task 7, and confirm the path-traversal assertion survives on `ownerDir`.
3. **Add** `frontend-vuejs/src/composables/__tests__/ticketBadges.spec.ts` (unit) — assert all four priority codes, all six status codes, and the `undefined` / unknown-code fallback to `'gray'`. Ten cases, and it is the guard that stops the two screens drifting apart again.
4. **Add** to `backend-nodejs/src/modules/customers/__tests__/customerChildren.schemas.spec.ts` — cases for the new history query schema: default 20, `pageSize=500` clamped or rejected per the schema you write, `page=0` rejected, non-numeric rejected. Match the style of the existing cases in that file.
5. **Run unchanged and expect green:** `CustomerDetailView.spec.ts`, `CustomersView.spec.ts`, `TicketsView.spec.ts`, `TicketDetailView.spec.ts`, `TicketNotesList.spec.ts`, `TicketAttachmentsList.spec.ts`. **If any of these needs an edit, the consolidation changed behaviour and is wrong.**
6. **Run unchanged and expect green:** all backend unit tests. If `customers.itest.ts` is runnable, run it too — it is the only thing covering the three moved routes.

---

## Migration / Rollback

No schema change. Every step is a file deletion or an in-place move, all revertible with `git revert` on the individual commit — which is why task grouping matters.

The one step with a half-applied hazard is **task 8**. If the controller handlers are added but a route is left pointing at a deleted inline function, Express registers `undefined` as middleware and **the whole app fails at startup**, not on that route. Verify with `npm run dev` after the task, not only with `npm run build`.

---

## Verification Steps

1. **Nothing references the deleted frontend files:** `grep -rn "HelloWorld\|TheWelcome\|WelcomeItem\|Icon\(Community\|Documentation\|Ecosystem\|Support\|Tooling\)\|HomeView\|stores/counter" frontend-vuejs/src/` returns nothing.
2. **Nothing references the deleted stylesheet:** `grep -rn "styles/main.css" frontend-vuejs/` returns nothing.
3. **The duplicated uploader is gone:** `ls backend-nodejs/src/modules/customers/attachments.upload.ts` fails, and `grep -rn "handleUpload\b\|customerDir\b" backend-nodejs/src/` returns nothing.
4. **The variant helpers exist once:** `grep -rn "priorityVariant\|statusVariant\|getPriorityVariant\|getStatusVariant" frontend-vuejs/src/` shows definitions in **one** file only.
5. **No composable is called from a template:** `grep -rn "useLocalizedName()(" frontend-vuejs/src/` returns nothing.
6. **No dynamic import in a request handler:** `grep -rn "await import(" backend-nodejs/src/modules/` returns nothing.
7. **Backend builds:** `npm run build` in `backend-nodejs/`.
8. **Backend tests:** `npm test` in `backend-nodejs/`.
9. **Backend starts:** `npm run dev` in `backend-nodejs/` reaches "listening"; `GET /api/v1/customers/:id/history` and `GET /api/v1/customers/:id/attachments` both answer for a seeded customer.
10. **Frontend typechecks, tests, lints, builds:** `npm run type-check`, `npx vitest run`, `npm run lint`, `npm run build` in `frontend-vuejs/`.
11. **Frontend runs:** `npm run dev` in `frontend-vuejs/`. Open the browser console, sign in, and walk customers → customer detail → tickets → ticket detail. **The console must be free of errors and of Vue warnings** — a missing component from task 1 shows up here and nowhere else.

---

## Done Criteria

- [ ] The nine scaffold files, `HelloWorld.spec.ts`, `stores/counter.ts`, and `src/assets/styles/main.css` are deleted, and `src/components/icons/` is gone.
- [ ] `backend-nodejs/src/modules/customers/attachments.upload.ts` is deleted.
- [ ] `handleUpload` and `customerDir` are deleted, and the path-traversal assertion still runs against `ownerDir`.
- [ ] `priorityVariant` / `statusVariant` are defined in exactly one file and imported by both ticket views.
- [ ] `CustomerDetailView.vue` uses `messageFor` from `useApiError`; the inline `err instanceof ApiError ? …` ternary appears nowhere in that file.
- [ ] The 404/403 dedicated states in `CustomerDetailView.vue` still render — the composable did not flatten them into a banner.
- [ ] `customers.routes.ts` has no inline handler and no `await import(`.
- [ ] A missing file on `POST /customers/:id/attachments` returns **422** with a `details` object, not 404.
- [ ] `GET /customers/:id/history` validates paging through a Zod schema, with the same defaults and bounds as before.
- [ ] No i18n key was removed.
- [ ] Both projects build; every pre-existing test passes **without being edited**, except `attachments.upload.spec.ts` and the deleted `HelloWorld.spec.ts`.
- [ ] The browser console is clean across the six screens in verification step 11.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 26.**
