# Story 09 — Customer Contacts, Notes & Profile Screen (Story: 17)

## Prerequisites

- **Story 08 completed** ([08-story-customer-crud-and-search-17.md](08-story-customer-crud-and-search-17.md)) — the `customers.*` permissions, `customers.service.ts`, `customers.controller.ts`, the `/api/v1/customers` router, and `CustomersView.vue` all exist. This story hangs child resources off them.
- **Story 07 completed** ([../user-management/07-story-authentication-and-authorization-16.md](../user-management/07-story-authentication-and-authorization-16.md)) — `req.auth.userId` is what stamps note authorship.
- **`TicketComments` exists as a precedent** for an authored child record: `backend-nodejs/src/modules/tickets/ticketComment.entity.ts` (29 lines). Customer notes follow its shape closely.

---

## Story Goal

Turn the customer row into a profile worth opening:

1. **Customer contacts** — several named people per customer, each with their own job title, email, and phone, and exactly one marked primary.
2. **Customer notes** — free-text notes stamped with author and timestamp, editable and deletable by their author.
3. **Customer profile screen** at `/customers/:id`, showing the profile fields, contacts, and notes, with inline editing.
4. **Notes and contacts UI** — add, edit, and delete without leaving the profile.

**Not in scope:**
- Attachments and interaction history → Story 10. The profile screen must leave a clearly marked slot for them so Story 10 is an addition, not a rewrite.
- Rich text or `@`-mentions in notes — plain text only.
- Per-contact login accounts. A contact is reference data, not a `User`.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticketComment.entity.ts` — all 29 lines. The authored-child pattern: a `@ManyToOne` back to the parent plus `authorUserId`, both indexed, with `onDelete: 'NO ACTION'`. Both new entities copy this.
2. `backend-nodejs/src/modules/customers/customer.entity.ts` — as left by Story 08, now including `isActive`.
3. `backend-nodejs/src/modules/customers/customers.service.ts` — created in Story 08. Reuse its `findById` for the parent-exists check, and match its exported-function style.
4. `backend-nodejs/src/modules/customers/customers.controller.ts` — created in Story 08. Its `isUnscoped()` helper and the branch check inside `getOne` are what every handler here must repeat, because **a child record inherits its parent's branch**.
5. `backend-nodejs/src/modules/users/users.routes.ts` — ~lines 15–49 for middleware ordering and the `@openapi` block style.
6. `backend-nodejs/src/database/migrations/1756000000000-AuthPermissions.ts` — all 46 lines. Migration style, including a genuine `down()`.
7. `backend-nodejs/src/common/errors/AppError.ts` — all 32 lines. `NotFoundError` (404), `ConflictError` (409), `ForbiddenError` (403) are the three used here.
8. `frontend-vuejs/src/views/UsersView.vue` — ~lines 111–252. The script-setup conventions: `messageFor()`, `onMounted` loading, and reloading after a mutation.
9. `frontend-vuejs/src/router/index.ts` — ~lines 15–58. Route shape and `meta.permission`; the new detail route is a child of the same `AppLayout` block.
10. `frontend-vuejs/src/composables/useFormat.ts` — ~lines 44–47. `formatDateTime` is what renders note timestamps in the active locale.
11. `frontend-vuejs/src/composables/useLocalizedName.ts` — all 17 lines. Note it reads `nameEn` / `nameAr`, so bilingual records that use other field names need the same shim `UsersView.vue` applies at ~lines 167–169.

Grep targets:
- Grep for `authorUserId` in `backend-nodejs/src/modules/` to see every existing authored record.
- Grep for `withDeleted` in `backend-nodejs/src/modules/customers/` to find the Story 08 spots that already account for soft deletes.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Contacts** | A customer may have zero or many. **At most one** may be `isPrimary`. Promoting a new primary demotes the previous one in the same transaction. |
| **Contact identity** | Contacts are reference data with no login. Email is optional and **not** unique — two contacts may legitimately share a shared inbox. |
| **Notes** | Author and timestamp are server-stamped from `req.auth.userId`; a client-supplied author is ignored. |
| **Note editing** | Only the **author** may edit their own note. An **Administrator** may delete any note; others may delete only their own. |
| **Scope** | Every contact and note operation re-checks the **parent customer's** branch. Holding `customers.update` is not enough if the customer belongs to another branch. |
| **Cascade** | Soft-deleting a customer leaves its contacts and notes in place, hidden with it. Nothing is hard-deleted. |
| **Permissions** | Reading contacts/notes needs `customers.read`; creating, editing, and deleting them needs `customers.update`. **No new permission codes are introduced.** |

---

## Backend Tasks

### 1 — Entities

**Create file: `backend-nodejs/src/modules/customers/customerContact.entity.ts`**

```ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Customer } from './customer.entity';

@Entity('CustomerContacts')
@Index(['customerId'])
export class CustomerContact extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameAr!: string;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  jobTitle?: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'bit', default: false })
  isPrimary!: boolean;
}
```

**Create file: `backend-nodejs/src/modules/customers/customerNote.entity.ts`**

```ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Customer } from './customer.entity';
import { User } from '../users/user.entity';

@Entity('CustomerNotes')
@Index(['customerId'])
@Index(['authorUserId'])
export class CustomerNote extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'uniqueidentifier' })
  authorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'authorUserId' })
  author?: User;

  @Column({ type: 'nvarchar', length: 4000 })
  body!: string;
}
```

`onDelete: 'NO ACTION'` matches every other relation in this codebase and is what keeps a soft-deleted parent's children intact.

No DataSource edit is needed — `backend-nodejs/src/config/data-source.ts` line 19 globs `modules/**/*.entity.{ts,js}`.

### 2 — Migration

**Create file: `backend-nodejs/src/database/migrations/1758000000000-CustomerContactsAndNotes.ts`**

```ts
await queryRunner.query(`
  CREATE TABLE [CustomerContacts] (
    [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
    [customerId] uniqueidentifier NOT NULL,
    [fullNameEn] nvarchar(200) NOT NULL,
    [fullNameAr] nvarchar(200) NOT NULL,
    [jobTitle] nvarchar(150) NULL,
    [email] nvarchar(255) NULL,
    [phone] nvarchar(20) NULL,
    [isPrimary] bit NOT NULL CONSTRAINT [DF_CustomerContacts_isPrimary] DEFAULT 0,
    [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
    [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
    [deletedAt] datetime2 NULL,
    CONSTRAINT [FK_CustomerContacts_Customer] FOREIGN KEY ([customerId])
      REFERENCES [Customers]([id]) ON DELETE NO ACTION
  )
`);

await queryRunner.query(`CREATE INDEX [IDX_CustomerContacts_customerId] ON [CustomerContacts]([customerId])`);
```

Then `CustomerNotes` with `customerId`, `authorUserId`, `body nvarchar(4000)`, both FKs `ON DELETE NO ACTION`, and indexes on each FK.

**Do not** add a filtered unique index on `(customerId, isPrimary)`. It would need `WHERE isPrimary = 1` **and** `WHERE deletedAt IS NULL`, and a filtered unique index interacts badly with the demote-then-promote update order. The single-primary rule is enforced in the service inside a transaction instead — state this in a comment so nobody "fixes" it later.

`down()` drops `CustomerNotes` then `CustomerContacts` — children before parents.

### 3 — Contacts service

**Create file: `backend-nodejs/src/modules/customers/customerContacts.service.ts`**

Exported functions, matching `customers.service.ts`:

- `toPublicContact(contact)` — plain mapper.
- `listContacts(customerId)` — ordered `isPrimary DESC, fullNameEn ASC` so the primary contact sits first.
- `createContact(customerId, input)` — if `input.isPrimary`, demote every sibling first.
- `updateContact(contactId, input)` — same promotion rule.
- `deleteContact(contactId)` — soft delete.

The promotion must be **transactional**, or a failure mid-way leaves a customer with two primaries or none:

```ts
/**
 * Promotes one contact to primary, demoting its siblings in the same
 * transaction. Doing this in two independent writes can leave a customer with
 * two primary contacts if the second write fails.
 */
async function promoteToPrimary(customerId: string, contactId: string): Promise<void> {
  await AppDataSource.transaction(async manager => {
    await manager
      .createQueryBuilder()
      .update(CustomerContact)
      .set({ isPrimary: false })
      .where('customerId = :customerId AND id != :contactId AND deletedAt IS NULL', { customerId, contactId })
      .execute();

    await manager.update(CustomerContact, { id: contactId }, { isPrimary: true });
  });
}
```

The explicit `deletedAt IS NULL` is required: a raw `UPDATE` query builder does **not** apply TypeORM's soft-delete filter the way `find` does.

Also: **deleting the primary contact does not auto-promote a replacement.** Choosing the next primary is a business decision, not a default. The customer is simply left without a primary until someone picks one, and the UI must show that state rather than hiding it.

### 4 — Notes service

**Create file: `backend-nodejs/src/modules/customers/customerNotes.service.ts`**

- `listNotes(customerId)` — newest first, joining the author so the UI can show a name. Select **only** the author fields it needs; never spread the whole `User`, which would leak `passwordHash` if the column selection ever changes. Map explicitly:

```ts
export interface PublicNote {
  id: string;
  customerId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; fullNameEn: string; fullNameAr: string } | null;
}
```

- `createNote(customerId, authorUserId, body)`.
- `updateNote(noteId, body)`.
- `deleteNote(noteId)` — soft delete.
- `findNoteById(noteId)` — throws `NotFoundError('Customer note')`; the controller needs the row to check authorship.

Authorship enforcement belongs in the **controller**, not the service, matching how `users.controller.ts` (~lines 94–96) keeps the self-deactivation rule out of `users.service.ts`.

### 5 — Schemas

**Create file: `backend-nodejs/src/modules/customers/customerChildren.schemas.ts`**

```ts
export const createContactSchema = z.object({
  fullNameEn: z.string().min(1).max(200),
  fullNameAr: z.string().min(1).max(200),
  jobTitle: z.string().max(150).nullish(),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema
  .partial()
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const noteBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const customerChildParamSchema = z.object({
  id: z.string().uuid(),          // the customer
  childId: z.string().uuid(),     // the contact or note
});
```

`.trim().min(1)` rejects a note of pure whitespace, which `.min(1)` alone would accept.

### 6 — Controller and routes

**Create file: `backend-nodejs/src/modules/customers/customerChildren.controller.ts`**

Every handler begins by loading the parent and applying the branch check. Factor it once:

```ts
/**
 * Loads the parent customer and rejects when it belongs to another branch.
 * Child records inherit the parent's scope — holding `customers.update` is not
 * sufficient if the customer itself is out of reach.
 */
async function requireCustomerInScope(req: Parameters<RequestHandler>[0]): Promise<Customer> {
  const customer = await findById(req.params.id);
  if (req.auth?.roleCode !== ROLE_CODES.ADMIN && customer.branchId !== req.auth!.branchId) {
    throw new ForbiddenError('This customer belongs to another branch');
  }
  return customer;
}
```

Note-mutation handlers add an authorship check:

```ts
const note = await findNoteById(req.params.childId);
if (note.customerId !== customer.id) throw new NotFoundError('Customer note');
if (note.authorUserId !== req.auth!.userId) {
  throw new ForbiddenError('You can only edit your own notes');
}
```

The `note.customerId !== customer.id` guard matters: without it, a caller could edit any note in the database by pairing its id with a customer they *can* reach. Deletion uses the same guard but also admits Administrators.

**File: `backend-nodejs/src/modules/customers/customers.routes.ts`** (created in Story 08) — append:

```
GET    /:id/contacts           customers.read
POST   /:id/contacts           customers.update
PATCH  /:id/contacts/:childId  customers.update
DELETE /:id/contacts/:childId  customers.update
GET    /:id/notes              customers.read
POST   /:id/notes              customers.update
PATCH  /:id/notes/:childId     customers.update
DELETE /:id/notes/:childId     customers.update
```

Each with `validate({ params: … , body: … })` and an `@openapi` block. These are multi-segment paths and do not collide with `/:id`.

### 7 — Seed

**File: `backend-nodejs/src/database/seed.ts`** — after the customer block Story 08 rewrote, add contacts and notes for the first two seeded customers: two contacts each (one primary, one not) and two notes each, authored by `admin@azm.local`. Guard with the same `findOne`-before-insert idempotency check used everywhere else in this file.

Give at least one contact a `null` `jobTitle` and one a `null` `email`, so the profile screen's empty-field rendering is exercised by the seed alone.

---

## Frontend Tasks

### 8 — Customer profile screen

**Create file: `frontend-vuejs/src/views/CustomerDetailView.vue`**

Route `/customers/:id`, reading the id via `useRoute().params.id`.

Layout — three stacked `BaseCard`s, plus a placeholder:

1. **Profile** — code, both names, email, phone, preferred language, status badge. An **Edit** toggle swaps the display for the Story 08 `PATCH /customers/:id` form. Visible under `customers.update`.
2. **Contacts** — a table with name, job title, email, phone, and a primary badge. Add / edit / delete under `customers.update`. When no contact is primary, show a subdued hint rather than silently omitting the badge column.
3. **Notes** — newest first, each showing author name (via `useLocalizedName` over the author's `fullNameEn`/`fullNameAr`), `formatDateTime(note.createdAt)`, and the body. Edit and delete appear **only** on the signed-in user's own notes; delete also appears for Administrators.
4. **A commented placeholder** where Story 10 inserts attachments and interaction history — so that story appends rather than restructures.

Wrap `email`, `phone`, and `code` in `<bdi>`, and preserve note line breaks with `white-space: pre-wrap` so a multi-line note does not collapse.

Handle the load failure paths distinctly: **404** → a "customer not found" empty state with a link back to the list; **403** → `t('errors.forbidden')`. Falling through to a generic error would leave a manager guessing why a Riyadh customer will not open.

### 9 — Route and list linkage

**File: `frontend-vuejs/src/router/index.ts`** — add as a sibling of the `customers` route inside the `AppLayout` children:

```ts
{
  path: 'customers/:id',
  name: 'customer-detail',
  component: () => import('@/views/CustomerDetailView.vue'),
  meta: { titleKey: 'nav.customers', permission: 'customers.read' },
},
```

**File: `frontend-vuejs/src/views/CustomersView.vue`** — make the code cell a `RouterLink` to `{ name: 'customer-detail', params: { id: row.id } }`. Story 08 shipped the rows deliberately inert; this is the story that lights them up.

Do **not** add a sidebar entry — the detail screen is reached through the list.

### 10 — Translations

Add to **both** `en.json` and `ar.json` (`locale-parity.spec.ts` enforces this):

- `customers.detail`: `title`, `edit`, `backToList`, `notFound.title`, `notFound.description`.
- `customers.contacts`: `title`, `add`, `edit`, `delete`, `primary`, `noPrimary`, `confirmDelete`, `columns.*`, `empty.title`, `empty.description`.
- `customers.notes`: `title`, `add`, `edit`, `delete`, `placeholder`, `confirmDelete`, `empty.title`, `empty.description`, `errors.notAuthor`.

---

## Edge Cases & Failure Modes

- **Two contacts promoted to primary concurrently** — both demote-then-promote sequences run inside `AppDataSource.transaction`, so the second blocks on the first and the last writer wins. Without the transaction, both could end up primary. Enforced in `promoteToPrimary` in `customerContacts.service.ts`.
- **Deleting the primary contact** — no successor is auto-promoted; the customer is left with none, and the profile shows the `noPrimary` hint. This is deliberate, not an oversight.
- **A raw `UPDATE` ignoring soft deletes** — TypeORM's query builder does not apply the `deletedAt IS NULL` filter that `find` does, so the demote statement would resurrect deleted contacts into the calculation. The predicate is written explicitly.
- **Note id from another customer** — `PATCH /customers/A/notes/<note-from-B>` is rejected with 404 by the `note.customerId !== customer.id` guard. Omitting it would expose every note in the database to anyone who can reach any one customer. **Test this explicitly.**
- **Editing another user's note** — 403 `'You can only edit your own notes'`. The UI hides the control, but the API is the actual boundary and must be tested directly.
- **Administrator deleting another user's note** — permitted, and the only asymmetry between the edit and delete rules. A note left by a departed employee still needs removing.
- **Whitespace-only note body** — rejected 422 by `.trim().min(1)`.
- **Note at exactly 4000 characters** — accepted; 4001 is rejected by Zod before the database can truncate. `nvarchar(4000)` and the schema bound must stay in step, so change both or neither.
- **Contact on a soft-deleted customer** — `findById` throws `NotFoundError` first, so every child route returns 404 rather than attaching orphans to a deleted parent.
- **Cross-branch access to a child** — `requireCustomerInScope` runs before any child work, so a manager cannot read or write contacts on another branch's customer even though `customers.update` is held.
- **Author account deactivated** — the note keeps its `authorUserId` and still renders the name; `onDelete: 'NO ACTION'` guarantees the row survives. History must not rewrite itself when someone leaves.
- **Arabic note body** — stored `nvarchar`; a regression to `varchar` shows as `?????`, which the README troubleshooting table already documents.

---

## Test Plan

1. **`backend-nodejs/src/modules/customers/__tests__/customerChildren.schemas.spec.ts`** (new, unit)
   - `noteBodySchema` rejects `'   '` and `''`, accepts 4000 characters, rejects 4001.
   - `createContactSchema` accepts `jobTitle: null`; rejects a malformed email.
   - `updateContactSchema` rejects `{}`.
   - `customerChildParamSchema` rejects a non-uuid `childId`.

2. **`backend-nodejs/src/modules/customers/__tests__/customerContacts.itest.ts`** (new, integration)
   - Creating a contact with `isPrimary: true` demotes the existing primary — assert exactly **one** primary remains.
   - Promoting via `PATCH` has the same effect.
   - Deleting the primary leaves **zero** primaries and does not error.
   - A soft-deleted contact is excluded from `listContacts` **and** unaffected by a later demote sweep.
   - Contacts are ordered primary-first.
   - A manager cannot list contacts on another branch's customer → 403.

3. **`backend-nodejs/src/modules/customers/__tests__/customerNotes.itest.ts`** (new, integration)
   - Creating a note stamps `authorUserId` from the token, **ignoring** any `authorUserId` in the body.
   - The author can edit their own note.
   - A different non-admin user editing it → 403.
   - An Administrator deleting another user's note → 204.
   - A non-admin deleting another user's note → 403.
   - `PATCH /customers/:otherCustomerId/notes/:noteId` → **404**, proving the parent-child guard.
   - Notes come back newest-first with a populated author.
   - The serialized note contains **no** `passwordHash` key anywhere.

4. **`frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts`** (new)
   - Mock `vue-router` with `useRoute` returning a fixed `params.id`, following `LoginView.spec.ts`.
   - Renders profile fields, contacts, and notes from mocked responses.
   - Marks the primary contact and shows the `noPrimary` hint when none is.
   - Shows edit/delete on the current user's own note and **not** on another user's.
   - Shows delete on another user's note when the signed-in user is an Administrator.
   - Renders the not-found state on a 404 and the forbidden message on a 403 — asserting the two differ.
   - Preserves newlines in a multi-line note body.

5. **`frontend-vuejs/src/views/__tests__/CustomersView.spec.ts`** (**modify**, from Story 08)
   - Add: each row's code cell links to `customer-detail` with the row's id.

6. **`frontend-vuejs/src/i18n/__tests__/locale-parity.spec.ts`** — unchanged; must still pass.

---

## Migration / Rollback

- **Apply:** `npm run migration:run`, then `npm run db:seed` for the demo contacts and notes.
- **Rollback:** `npm run migration:revert` drops `CustomerNotes` then `CustomerContacts`. Both are new tables, so nothing pre-existing is at risk.
- **Half-applied state:** if the process dies after `CustomerContacts` is created but before `CustomerNotes`, re-running fails on the already-present table. Drop `CustomerContacts` manually and re-run.
- **No customer data is touched** by this migration — `Customers` itself is unmodified, so a rollback cannot lose customer records.

---

## Verification Steps

1. **Migration applies:** `npm run migration:run` in `backend-nodejs`.
2. **Seed re-applies idempotently:** `npm run db:seed` twice — the second run adds nothing.
3. **Backend unit tests:** `npm test` in `backend-nodejs`.
4. **Backend integration tests:** `npm run test:integration` in `backend-nodejs`.
5. **Backend builds:** `npm run build` in `backend-nodejs` → exits 0.
6. **Frontend tests:** `npm test` in `frontend-vuejs`.
7. **Frontend builds:** `npm run build` in `frontend-vuejs`.
8. **Manual — profile:** as `admin@azm.local`, open **Customers**, click a code → the profile shows contacts and notes.
9. **Manual — primary contact:** promote the second contact → the badge moves and the first loses it. Reload to confirm it persisted.
10. **Manual — note ownership:** add a note as `admin@azm.local`, sign in as `manager@azm.local`, open the same customer → the admin's note shows **no** edit control.
11. **Manual — cross-branch:** as `manager@azm.local`, navigate directly to a Riyadh customer's `/customers/:id` → the forbidden message, not a blank page.
12. **Manual — Arabic:** switch to Arabic, confirm the profile mirrors, note timestamps render in Arabic, and email/phone stay left-to-right.
13. **Swagger:** the eight new child paths appear under **Customers**.
14. **Regression:** the Story 08 list screen still searches, filters, paginates, and creates.

---

## Done Criteria

- [ ] `CustomerContact` and `CustomerNote` entities exist and are picked up by the DataSource glob without manual registration.
- [ ] Migration `1758000000000-CustomerContactsAndNotes.ts` creates both tables with FKs and indexes, and `down()` drops them child-first.
- [ ] At most one primary contact per customer, enforced **inside a transaction**, with the soft-delete predicate written explicitly.
- [ ] Deleting the primary contact leaves none and does not auto-promote.
- [ ] Notes are server-stamped with `authorUserId`; a client-supplied author is ignored.
- [ ] Only the author may edit a note; the author **or** an Administrator may delete it.
- [ ] A note id belonging to a different customer returns 404, and this is covered by a test.
- [ ] Note payloads never contain `passwordHash`.
- [ ] All eight child routes are registered, permission-gated on `customers.read` / `customers.update`, and documented in Swagger.
- [ ] **No new permission codes** were introduced.
- [ ] Every child operation re-checks the parent customer's branch.
- [ ] `CustomerDetailView.vue` shows profile, contacts, and notes, supports inline edit, and distinguishes 404 from 403.
- [ ] The profile leaves a marked placeholder for Story 10's attachments and interaction history.
- [ ] Customer codes in the list link to the detail route.
- [ ] All new strings are in both `en.json` and `ar.json`; `locale-parity.spec.ts` passes.
- [ ] The seed adds contacts and notes for at least two customers and stays idempotent.
- [ ] Backend and frontend tests and both builds pass; Stories 01–08 show no regressions.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 10.**
