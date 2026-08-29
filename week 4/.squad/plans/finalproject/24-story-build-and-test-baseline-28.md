# Story 24 — Build, Typecheck & Test Baseline (Story: 28)

## Prerequisites

- **Work item 27 completed** — Stories 15–23 in [../completion/00-overview.md](../completion/00-overview.md). Every module this work item reviews already exists.
- **No new database migration.** The highest applied migration is `1767000000000-Administration.ts`. This story adds none, and neither does any story in this feature.

**This story runs first and blocks the other four.** Stories 25–28 all end with "every test passes and both projects build". That sentence is currently false in both projects, so until this story lands there is no baseline to regress against.

---

## Story Goal

Make the two commands in the work item's Definition of Done actually pass:

1. **`npm run build` in `backend-nodejs/` succeeds.** It currently fails with **52 TypeScript errors**, all inside the customers module and the shared upload module.
2. **`npm run type-check` in `frontend-vuejs/` succeeds.** It currently fails with **19 errors** across five files.
3. **`npx vitest run` in `frontend-vuejs/` passes.** **3 of 205 tests fail** today, in two spec files.
4. **`npm run lint` in `frontend-vuejs/` passes.** ESLint reports **217 errors**; oxlint reports 25.
5. **Fix the one runtime defect the typecheck exposes:** every `/api/v1/customers/*` success response returns `correlationId: undefined`.

**Not in scope:**
- Any visual change. Stories 26 and 27 own the UI.
- Deleting unused files. Story 25 owns that, and doing it here would hide which errors were real.
- Changing an API contract, a permission, a route path, or a response shape — other than filling in the `correlationId` that was always meant to be there.
- Adding a migration or touching the seed.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/customers/customers.controller.ts` — the **whole file** (~130 lines). Line 1 imports `RequestHandler` as a **type only**; the exported object at line 19 has **no type annotation**, so `(req, res, next)` on lines 20, 45, 63, 80, 99, and 118 are implicit `any`. That is 18 of the 52 backend errors.
2. `backend-nodejs/src/modules/admin/referenceData.controller.ts` — **lines 5–25**. The convention every other controller follows: `(async (req, res, next) => { … }) as RequestHandler,` and `correlationId: req.correlationId`. Copy this exactly.
3. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — **lines 37–45** and the nine `}) as RequestHandler,` casts (lines 72, 92, 115, 134, 154, 180, 206, 230, 262). Confirms the pattern is project-wide, not one module's taste.
4. `backend-nodejs/src/types/express.d.ts` — the **whole file** (23 lines). The `Express.Request` augmentation declares **`correlationId`** and **`auth`**. It does **not** declare `id`.
5. `backend-nodejs/src/common/middleware/correlationId.ts` — the **whole file** (15 lines). Line 9 assigns `req.correlationId`. Nothing anywhere assigns `req.id`.
6. `backend-nodejs/src/modules/customers/customerChildren.controller.ts` — **lines 45, 59, 73, 99, 113, 137**. Six more `req.id`.
7. `backend-nodejs/src/modules/customers/customers.routes.ts` — the three inline handlers at **~lines 474–491**, **~517–534**, and **~642–658**. Each dynamically imports `./customerChildren.controller` **inside the request handler** and ends with `correlationId: req.id`.
8. `backend-nodejs/src/common/uploads/attachments.upload.ts` — **lines 78–91** (`wrapMulter`) and **lines 96–98, 104**. `buildUploader` returns `multer(...).single('file')`, which is a `RequestHandler`, but `wrapMulter` declares its parameter as `multer.Multer`. Four errors, one of them `TS2349: This expression is not callable`.
9. `backend-nodejs/src/modules/customers/customerContacts.service.ts` — **lines 95–103**. `updateContact` saves, then re-reads with `findOneBy` and passes the resulting `CustomerContact | null` straight into `toPublicContact`.
10. `backend-nodejs/src/modules/customers/customerAttachments.service.ts` — **lines 75–83**. The `uploadedBy` literal does not satisfy `User & { id; fullNameEn; fullNameAr }`.
11. `frontend-vuejs/src/stores/auth.store.ts` — the `user` ref's inferred shape. It has **no `permissions` field**, yet `CustomerDetailView.vue:402` reads `auth.user?.permissions` and four specs assign one. Six of the 19 frontend errors.
12. `frontend-vuejs/src/components/ui/BaseBadge.vue` — **lines 8–11**. `variant` is a six-member union. `TicketsView.vue:408` and `:418` return plain `string`. Four errors.
13. `frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts` — **lines 128–150**. Both failing tests build a plain `new Error(...)` and `Object.assign(error, { status: 404 })`.
14. `frontend-vuejs/src/views/CustomerDetailView.vue` — **lines 429–437**. The handler branches on `err instanceof ApiError`. A plain `Error` with a `status` property is not one.
15. `frontend-vuejs/src/views/__tests__/CustomersView.spec.ts` — **lines 226–245**. Two `mockReturnValueOnce` calls, three fetches.
16. `frontend-vuejs/src/views/CustomersView.vue` — **lines 257–291**. `requestSeq`, the 300 ms debounce, and the `onMounted` fetch.

Grep targets:
- `grep -rn "req\.id" backend-nodejs/src/` — **14 hits, all in the customers module.** Every one is a bug.
- `grep -rn "req\.correlationId" backend-nodejs/src/ | wc -l` — **67 hits.** The correct spelling, used everywhere else.

---

## Product rules (from story)

| Concern | Current behaviour | Required behaviour |
|---|---|---|
| **Backend build** | `npm run build` exits non-zero with 52 errors. | Exits 0. |
| **`correlationId` on customer responses** | Every `/api/v1/customers/*` **success** envelope carries `correlationId: undefined`, which `JSON.stringify` **drops entirely** — the key is absent from the JSON. Error responses are correct, because `errorHandler.ts:46` uses the right name. | Present on success and error alike, matching every other module. |
| **Controller shape** | The customers module uses a bare object literal; every other module uses `(async … ) as RequestHandler`. | Customers matches the rest. |
| **Test fixtures** | Three specs assert against error and mock shapes the production code no longer produces. | Fixtures match production; **the assertions themselves do not change** — the behaviour they describe is the behaviour we want. |
| **`any` in application code** | 38 ESLint errors under `src/` excluding tests. | Application code is clean. Test files may keep `any` via a scoped ESLint override — mocking is where `any` earns its place. |

---

## Backend Tasks

### 1 — Convert `req.id` to `req.correlationId` (14 sites)

**File: `backend-nodejs/src/modules/customers/customers.controller.ts`** — lines 38, 56, 73, 92, 111.

**File: `backend-nodejs/src/modules/customers/customerChildren.controller.ts`** — lines 45, 59, 73, 99, 113, 137.

**File: `backend-nodejs/src/modules/customers/customers.routes.ts`** — lines 483, 528, 653.

A single mechanical replacement of `req.id` with `req.correlationId`. **Do not add an `id` field to `express.d.ts`** — that would make the wrong spelling compile and leave the value undefined at runtime.

Verify afterwards that the grep returns nothing:

```bash
grep -rn "req\.id" backend-nodejs/src/
```

### 2 — Annotate the two customers controllers

**File: `backend-nodejs/src/modules/customers/customers.controller.ts`**

Wrap each of the six handlers so it matches `referenceData.controller.ts`:

```ts
export const customersController = {
  list: (async (req, res, next) => {
    try {
      // … unchanged body …
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
  // … create, getOne, update, setActive, remove — same shape …
};
```

A type-only import of `RequestHandler` is sufficient for the cast; leave line 1 as it is. **Leave `isUnscoped` at line 15 exactly as it is** — `Parameters<RequestHandler>[0]` already types it correctly.

**File: `backend-nodejs/src/modules/customers/customerChildren.controller.ts`** — the same wrap for all eight handlers. This clears 42 of the 43 `TS7006` errors.

### 3 — Fix `wrapMulter`'s parameter type

**File: `backend-nodejs/src/common/uploads/attachments.upload.ts`**

`buildUploader` ends with `.single('file')`, which returns a `RequestHandler`, not a `Multer`. Change the signature at line 78:

```ts
function wrapMulter(uploadMiddleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    uploadMiddleware(req, res, err => {
      // … unchanged …
    });
  };
}
```

Also give `buildUploader` an explicit `: RequestHandler` return type so the contract is stated rather than inferred. Four errors clear (lines 80, 97, 98, 104).

### 4 — Fix `updateContact`'s null re-read

**File: `backend-nodejs/src/modules/customers/customerContacts.service.ts`** — line 102.

The function already holds the saved entity. The extra `findOneBy` is a second round-trip **and** the source of the `CustomerContact | null` error. Replace:

```ts
const saved = await contacts().save(contact);
return toPublicContact(saved);
```

This is both the type fix and a query removed — the work item's task 4 ("unnecessary data loading") in one edit.

### 5 — Fix the `uploadedBy` literal

**File: `backend-nodejs/src/modules/customers/customerAttachments.service.ts`** — lines 79–82.

`toPublicAttachment` expects the row's `uploadedBy` relation; the literal supplies three fields, not a `User`. Narrow `toPublicAttachment`'s parameter to the three fields it actually reads (`id`, `fullNameEn`, `fullNameAr`) rather than widening the literal to a full `User` — the function does not use the rest of the entity, and a structural parameter type is the honest signature. Keep the empty-string names and the comment explaining why they are empty on the create path.

### 6 — Stop returning internal exception text to the client

**File: `backend-nodejs/src/common/middleware/errorHandler.ts`** — lines 23–26.

For a non-`AppError`, line 25 assigns `message = err.message || message`, so an unhandled `TypeError` or a raw driver error message reaches the browser under a 500. Keep the stack for the log at line 32, but send the generic text:

```ts
} else if (err instanceof Error) {
  // Log the real message and stack (below); never return them. A driver or
  // runtime message can name a table, a column, or a file path.
  stack = err.stack;
}
```

Then pass `err.message` explicitly into the `logger.error` call so nothing is lost from the server log. `errorHandler.spec.ts` asserts on this path — read it before editing and update the expectation in the same commit.

---

## Frontend Tasks

### 7 — Give `auth.user` a `permissions` field

**File: `frontend-vuejs/src/stores/auth.store.ts`**

The store's `user` ref is typed by inference from its initial value, so `permissions` is absent from the type even though the login response carries it and `auth.can()` depends on it. Declare an explicit interface and type the ref with it:

```ts
export interface AuthUser {
  id: string
  email: string
  fullNameEn: string
  fullNameAr: string
  isActive?: boolean
  branchId: string
  departmentId?: string
  roleId?: string
  role?: { id: string; code: string; nameEn: string; nameAr: string }
  /** Flattened permission codes from the user's role. `auth.can()` reads this. */
  permissions?: string[]
  /** Non-null only for an account linked to a Customers row. */
  customerId?: string | null
}
```

Match the optionality to what the fixtures actually assign (`CustomerDetailView.spec.ts:154–161`, `CustomersView.spec.ts:266` and `:322`, `TicketDetailView.spec.ts:242` and `:309`, `TicketsView.spec.ts:292`) — those omit `isActive`, `departmentId`, and `roleId`, so those must be optional or the specs break again. **Six errors clear and no spec changes.**

### 8 — Type the badge variant

**Create file: `frontend-vuejs/src/types/ui.ts`**

```ts
/** The variants `BaseBadge` accepts. Kept next to the component contract so a
 *  helper that computes one cannot drift from what the component renders. */
export type BadgeVariant = 'primary' | 'info' | 'success' | 'danger' | 'warning' | 'gray'
```

**File: `frontend-vuejs/src/components/ui/BaseBadge.vue`** — import `BadgeVariant` and use it in `Props` instead of the inline union at lines 8–11, so there is one definition.

**File: `frontend-vuejs/src/views/TicketsView.vue`** — lines 408 and 418: change both return types to `BadgeVariant` and both `Record<string, string>` to `Record<string, BadgeVariant>`.

**File: `frontend-vuejs/src/views/TicketDetailView.vue`** — lines 552 and 562: identical change.

Four errors clear. **Story 25 consolidates these two identical pairs into one module** — leave them duplicated here so that story's diff shows the consolidation cleanly.

### 9 — Narrow the nullable refs in the two detail views

**File: `frontend-vuejs/src/views/CustomerDetailView.vue`** — lines 421–425 sit inside `loadCustomer`, after `customer.value = response.data`. TypeScript cannot see that the assignment guarantees non-null across the `await` boundary. Assign to a local first:

```ts
const loaded = response.data
customer.value = loaded
editForm.fullNameEn = loaded.fullNameEn
editForm.fullNameAr = loaded.fullNameAr
editForm.email = loaded.email || ''
editForm.phone = loaded.phone || ''
editForm.preferredLanguage = loaded.preferredLanguage
```

**File: `frontend-vuejs/src/views/TicketDetailView.vue`** — lines 658–662: the same shape, the same fix. **Do not reach for `!`** — the local is both shorter and safe.

### 10 — Repair the three failing tests

**File: `frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts`** — lines 128–150.

Both tests reject with a plain `Error` carrying a `status` property. `api/client.ts` throws `ApiError` and nothing else, so the fixture describes an error the app cannot produce. Import the real class and construct it:

```ts
import { ApiError } from '@/types/api'

it('renders not-found state on 404', async () => {
  ;(api.get as any).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND'))
  // … assertions unchanged …
})

it('renders forbidden message on 403', async () => {
  ;(api.get as any).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN'))
  // … assertions unchanged …
})
```

**The two assertions stay exactly as written.** They describe the behaviour the view already implements at lines 430–436; only the input was wrong.

**File: `frontend-vuejs/src/views/__tests__/CustomersView.spec.ts`** — lines 226–245.

The spec queues **two** `mockReturnValueOnce` promises but the component fetches **three** times: once from `onMounted`, once for the `"a"` search, once for the `"ab"` search. The mount consumes `firstPromise`, so the "stale" promise the test later resolves is the mount's, and the `"ab"` fetch receives `undefined` — `response.data` throws and `customers` stays `[]`.

Queue the mount fetch explicitly, ahead of the two the test is about:

```ts
;(api.get as any)
  // The component fetches once on mount. Without this the two queued promises
  // shift by one and the assertion measures the wrong request.
  .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
  .mockReturnValueOnce(firstPromise)
  .mockReturnValueOnce(secondPromise)
```

Then `await flushPromises()` after mount before the first `setValue`, so the mount fetch has settled. The `requestSeq` guard under test is unchanged.

### 11 — Clear the lint errors

**File: `frontend-vuejs/eslint.config.ts`**

`@typescript-eslint/no-explicit-any` accounts for **207 of the 217 errors**, and **169 of those are in `__tests__/`**, where `any` is how a mock gets typed. Add one override block:

```ts
{
  // Mocks and fixtures are deliberately loosely typed; the production rule stands.
  files: ['**/__tests__/**', '**/*.spec.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'vitest/no-conditional-expect': 'off',
    'vitest/require-mock-type-parameters': 'off',
  },
},
```

Then fix the remaining **38 application-code errors** by naming the types. The largest cluster is `catch (err: any)` and untyped `response.data` in the portal files (`PortalTicketDetailView.vue:239, 252, 271`, `PortalTicketsView.vue:176`) — each is an `unknown` in a catch or a declared response interface.

Also fix the eight `no-unused-vars` and two `vue/no-mutating-props`:

| File | Line | Fix |
|---|---|---|
| `src/components/layout/AppSidebar.vue` | 46 | Delete `const route = useRoute()` and drop `useRoute` from the import. |
| `src/components/ui/BaseButton.vue` | 19, 30 | Drop the unused `computed` import; change `const props = withDefaults(...)` to a bare `withDefaults(...)`. |
| `src/components/ui/BaseDialog.vue` | 45 | Same — drop `const props =`. |
| `src/views/AboutView.vue` | 84 | `catch { … }` with no binding. **Story 27 deletes this file** — make the minimal fix here so lint is green in between. |
| `src/views/TicketsView.vue` | 286 | Remove the unused `ApiError` import. |
| `src/views/TicketsView.vue` | 503 | `openCreate` is dead **and that is a bug** — see task 12. Do not delete it. |
| `src/views/TicketsView.vue` | 525 | `catch { … }` with no binding. |
| `src/components/tickets/TicketNotesList.vue` | 59, 65 | The parent passes a `reactive()` form object and both `TicketDetailView.vue` and `PortalTicketDetailView.vue` rely on the child writing into it. **Keep the behaviour.** Add an `eslint-disable-next-line vue/no-mutating-props` above each `v-model`, with a comment naming the contract: *"`form` is a shared reactive object owned by the parent; the child edits it in place by design."* Converting to `defineModel` would touch two parents and two passing spec files for no behavioural gain, which the work item's "do not introduce unnecessary patterns" rules out. |

### 12 — Call `openCreate()` when the create dialog opens

**File: `frontend-vuejs/src/views/TicketsView.vue`** — line 12.

`openCreate()` (lines 503–513) resets `form.subject`, `form.description`, `form.department`, `form.priorityCode`, `form.categoryCode`, `selectedCustomer`, `customerSearch`, and `customerSearchResults`. **Nothing calls it.** The button at line 12 does `@click="showCreateDialog = true"`, so opening the dialog a second time shows the previous attempt's text with the previously selected customer still attached.

Move the flag into the function and call `openCreate()` alone from the button, so there is one entry point for "start a new ticket".

---

## Edge Cases & Failure Modes

- **`req.id` is `undefined`, not a crash.** `JSON.stringify` omits an `undefined` value, so the key vanishes from the body and no test noticed. After task 1, a client that logs `correlationId` on a customers call starts seeing a value where it saw nothing. Nothing consumes it today — `frontend-vuejs/src/types/api.ts:8` types it optional — so no frontend change follows.
- **`as RequestHandler` hides a genuine return-type mismatch.** The handlers `return res.json(...)`, which returns `Response`, not `void`. The cast is what the rest of the codebase uses to bridge that, and it is why `tickets.controller.ts` has nine of them. Applying it to customers makes the module consistent; it does **not** make it less safe than its siblings. Do not remove the casts elsewhere in this story.
- **The `errorHandler` change is user-visible.** A 500 previously showed the raw exception text in the UI banner; it now shows "An internal server error occurred". That is the intent — but check `errorHandler.spec.ts` and `src/__tests__/app.itest.ts` for an assertion on the old text before committing.
- **`auth.store.ts`'s explicit interface can break unrelated specs.** The fixtures listed in task 7 omit fields the inferred type had. If any becomes required, those specs fail at typecheck even though they pass at runtime. Run `npm run type-check` **and** the test suite after this edit, not one or the other.
- **The ESLint override must not leak into application code.** Verify with `npx eslint src --ignore-pattern "**/__tests__/**"`, which must report **0** errors afterwards. It reports 38 today.
- **`vue/no-mutating-props` disables are per-line, not per-file.** A file-level disable would hide a future real mutation. Two `eslint-disable-next-line` comments, no more.
- **`npm run lint` runs with `--fix`.** It rewrites files as a side effect. Run it, then run `git diff` and read what it changed before committing — an auto-fix that reformats a template is not automatically correct.
- **The integration suite needs SQL Server.** `npm run test:integration` opens a real connection through `data-source.ts`. It is **not** part of this story's gate; `npm test` (the `unit` project, 242 tests, currently all green) is. If a database is available, run it and record the result — do not fix pre-existing integration failures here unless tasks 1–6 caused them.
- **`openCreate()` resets `form.department`, not `form.departmentId`.** Confirm the create payload builder reads the same field name before assuming the reset is complete; a rename between the two would leave one field stale and the test in task 5 of the Test Plan would still pass.

---

## Test Plan

1. **Modify** `frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts` — the two fixtures in task 10. Assertions unchanged.
2. **Modify** `frontend-vuejs/src/views/__tests__/CustomersView.spec.ts` — the mock queue in task 10. Assertions unchanged.
3. **Modify** `backend-nodejs/src/common/middleware/__tests__/errorHandler.spec.ts` — the non-`AppError` 500 case now expects the generic message and asserts the raw exception text is **absent** from the body.
4. **Add** `backend-nodejs/src/modules/customers/__tests__/customers.controller.spec.ts` (unit) — call `customersController.list` with a stub `req` carrying `correlationId: 'abc'` and a `res` spy; assert the JSON body contains `correlationId: 'abc'`. This is the regression guard for the whole `req.id` class of bug. Follow the stub style in `src/common/middleware/__tests__/authorize.spec.ts`.
5. **Add** to `frontend-vuejs/src/views/__tests__/TicketsView.spec.ts` — a case that opens the create dialog, types a subject, closes it, reopens it, and asserts the subject input is empty. Guards task 12. Match the existing harness in that file.
6. **Add** `frontend-vuejs/src/components/ui/__tests__/BaseBadge.spec.ts` (unit) — mount each of the six variants and assert the class. Cheap, and it pins the `BadgeVariant` union that Story 25 imports.
7. **Run unchanged and expect green:** the other 202 frontend tests and all 242 backend unit tests. Any new failure is caused by this story.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/` — **0 errors** (52 today).
2. **Backend builds:** `npm run build` in `backend-nodejs/` — exits 0 and writes `dist/`.
3. **Backend tests:** `npm test` in `backend-nodejs/` — 242+ passing.
4. **No `req.id` remains:** `grep -rn "req\.id" backend-nodejs/src/` returns nothing.
5. **Frontend typechecks:** `npm run type-check` in `frontend-vuejs/` — **0 errors** (19 today).
6. **Frontend tests:** `npx vitest run` in `frontend-vuejs/` — **0 failures** (3 today).
7. **Application lint is clean:** `npx eslint src --ignore-pattern "**/__tests__/**"` in `frontend-vuejs/` — **0 errors** (38 today).
8. **Full lint:** `npm run lint` in `frontend-vuejs/` exits 0. Re-run it a second time and confirm `git diff --exit-code` is clean.
9. **Frontend builds:** `npm run build` in `frontend-vuejs/`.
10. **Backend starts:** `npm run dev` in `backend-nodejs/` reaches "listening" with no error, and `GET http://localhost:3000/health` returns `{"status":"up"}`.
11. **Regression:** `GET /api/v1/customers` with a valid token returns a body whose `correlationId` matches the `x-correlation-id` response header.

---

## Done Criteria

- [ ] `npm run build` in `backend-nodejs/` exits 0.
- [ ] `npm run type-check` in `frontend-vuejs/` exits 0.
- [ ] `npx vitest run` in `frontend-vuejs/` reports 0 failures.
- [ ] `npm test` in `backend-nodejs/` reports 0 failures.
- [ ] `npm run lint` in `frontend-vuejs/` exits 0, and application code carries no `no-explicit-any` suppression.
- [ ] `grep -rn "req\.id" backend-nodejs/src/` returns nothing.
- [ ] Every `/api/v1/customers/*` success response includes a real `correlationId`.
- [ ] `customersController` and `customerChildrenController` use `(async … ) as RequestHandler`, matching every other module.
- [ ] A 500 from a non-`AppError` returns the generic message; the raw exception text appears only in the server log.
- [ ] `auth.user` has a declared type including `permissions`, and no spec fixture changed to accommodate it.
- [ ] `BadgeVariant` exists in one place and both ticket views return it.
- [ ] Reopening the ticket create dialog shows an empty form, covered by a test.
- [ ] No file was deleted, no route changed, no style edited.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 25.**
