# Story 13 — Ticket Notes & Attachments (Story: 18)

## Prerequisites

- **Story 12 completed** ([12-story-ticket-lifecycle-assignment-and-history-18.md](12-story-ticket-lifecycle-assignment-and-history-18.md)) — `requireTicketInScope` is exported from `tickets.controller.ts` and this story reuses it unchanged.
- **Story 11 completed** ([11-story-ticket-data-model-creation-and-search-18.md](11-story-ticket-data-model-creation-and-search-18.md)) — the tickets module, routes, and permission codes exist.
- **Story 10 completed** ([../customer-management/10-story-customer-attachments-and-interaction-history-17.md](../customer-management/10-story-customer-attachments-and-interaction-history-17.md)) — `multer` is already a dependency, `UPLOAD_DIR` / `MAX_UPLOAD_BYTES` are already in `env.ts`, `uploads/` is already gitignored, and `attachments.upload.ts` already exists. **This story does not add a new dependency or a new env var.**
- **The `TicketComments` table already exists.** Story 02's migration `1724086800000-InitialCrmSchema.ts` created it (~lines 161–177) and `backend-nodejs/src/modules/tickets/ticketComment.entity.ts` is already mapped to it, including an `isInternal` flag. **Do not create a comments table** — this story wires up the one that is already there.

---

## Story Goal

Give a ticket the two attachment surfaces an agent needs while working it:

1. **Ticket notes**, built on the existing `TicketComments` table, with the **internal vs customer-visible** distinction that table already models.
2. **Ticket attachments** — upload, list, download, and soft-delete, reusing Story 10's upload infrastructure rather than duplicating it.
3. **Generalise `attachments.upload.ts`** so one hardened uploader serves both customers and tickets. This is the only shared-code change in the story and it must not alter customer behaviour.
4. **Notes and attachments appear in the ticket history timeline** from Story 12, so the audit view is complete.

**Not in scope:**
- All ticket **screens** → Story 14.
- Editing an attachment's metadata after upload. Delete and re-upload instead.
- Virus scanning, thumbnail generation, inline preview, or image resizing.
- Purging files from disk when their metadata row is soft-deleted — see **Known limitations**.
- Notifying a customer when a customer-visible note is added.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticketComment.entity.ts` — the **entire file** (29 lines). Everything this story needs for notes already exists: `ticketId` (~lines 10–15), `authorUserId` (~lines 17–22), `body` at `nvarchar(4000)` (~lines 24–25), and **`isInternal` defaulting to false** (~lines 27–28).
2. `backend-nodejs/src/modules/customers/attachments.upload.ts` — all 65 lines, closely. `UPLOAD_ROOT` (line 9), the `ALLOWED_MIME_TYPES` set (~lines 11–25, note **SVG is deliberately absent**), the double containment check in `customerDir` (~lines 27–33), the `crypto.randomUUID()` filename with a sanitised extension (~lines 40–43), and `handleUpload` translating multer's `LIMIT_FILE_SIZE` into a 413 (~lines 58–65). **Line 37 hardcodes `req.params.id`** — that is the single line blocking reuse.
3. `backend-nodejs/src/modules/customers/customerAttachment.entity.ts` — all 34 lines. The entity shape to mirror, including `sizeBytes` typed as **`string`** (~lines 32–33) because the mssql driver returns `bigint` as a string.
4. `backend-nodejs/src/modules/customers/customerAttachments.service.ts` — the whole file. Note that `createAttachment` **unlinks the uploaded file when the metadata insert fails**, and that `softDeleteAttachment` removes only the row.
5. `backend-nodejs/src/modules/customers/customers.routes.ts` — the attachment routes near the end of the file. The `authorize(...)` → `handleUpload` middleware order, the download handler's second containment check, and the `Content-Disposition` / `X-Content-Type-Options: nosniff` headers.
6. `backend-nodejs/src/modules/customers/customerNotes.service.ts` — the whole file. The author join with an explicit `.select([...])`, and `toPublicNote`. **Never spread a `User`.**
7. `backend-nodejs/src/modules/customers/customerChildren.controller.ts` — the author-only edit rule and the author-or-admin delete rule. This story applies the same two rules to ticket notes.
8. `backend-nodejs/src/modules/customers/customerChildren.schemas.ts` — `noteBodySchema` with `.trim().min(1)`, which rejects a whitespace-only note.
9. `backend-nodejs/src/modules/tickets/tickets.controller.ts` (Story 12) — `requireTicketInScope`, exported for exactly this purpose.
10. `backend-nodejs/src/modules/tickets/ticketHistory.service.ts` (Story 12) — `listHistory`. Task 8 extends it.
11. `backend-nodejs/src/config/env.ts` — the `UPLOAD_DIR` and `MAX_UPLOAD_BYTES` entries added by Story 10.

Grep targets:
- Grep for `customerDir` across `backend-nodejs/src/` — every call site must be updated by task 1.
- Grep for `handleUpload` to find its single current registration.
- Grep for `isInternal` — confirm nothing consumes it yet, so this story is free to define its semantics.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Internal notes** | `isInternal: true` is staff-only. It is **never** returned to a `CUSTOMER`-role caller. Default is `true` — an agent's working note is private unless deliberately shared. |
| **Note authorship** | `authorUserId` is stamped from the token. Only the author may **edit**. The author **or** an Administrator may **delete**. |
| **Note permission** | Reading needs `tickets.read`; writing needs `tickets.update`. No new permission codes. |
| **Attachment permission** | Listing and downloading need `tickets.read`; uploading and deleting need `tickets.update`. |
| **Attachment naming** | The stored filename is a generated UUID. The user's filename is metadata for display only and never touches the filesystem. |
| **Allowed types** | The Story 10 allowlist, unchanged. **SVG stays excluded** — it executes script when rendered inline. |
| **Size limit** | `MAX_UPLOAD_BYTES`, default 10 MB. Exceeding it is a **413**, not a 400. |
| **Deletion** | Soft delete of the metadata row. The file stays on disk. |
| **Scope** | Every note and attachment operation first resolves the parent ticket through `requireTicketInScope`. Holding `tickets.update` is not sufficient if the ticket is in another branch. |

---

## Backend Tasks

### 1 — Generalise the uploader

**File: `backend-nodejs/src/modules/customers/attachments.upload.ts`**

Move it to **`backend-nodejs/src/common/uploads/attachments.upload.ts`** — it now serves two modules and no longer belongs to `customers/`.

Replace the customer-specific `customerDir` with a parameterised version, keeping the double containment check exactly as it is:

```ts
/**
 * Resolves the storage directory for one owner record and asserts the result
 * is inside UPLOAD_ROOT. `scope` separates customers from tickets so a uuid
 * collision across tables cannot merge two owners' files.
 */
export function ownerDir(scope: 'customers' | 'tickets', ownerId: string): string {
  const dir = path.resolve(UPLOAD_ROOT, scope, ownerId);
  if (!dir.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new ValidationError({ ownerId: 'Invalid storage path' });
  }
  return dir;
}
```

Replace the hardcoded `req.params.id` on line 37 by making the multer factory take the scope, so the destination is derived per registration rather than assumed:

```ts
function buildUploader(scope: 'customers' | 'tickets') {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const dir = ownerDir(scope, req.params.id);
        fs.mkdir(dir, { recursive: true }, err => cb(err, dir));
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 20).replace(/[^A-Za-z0-9.]/g, '');
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
  return multer({ storage, limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 }, fileFilter })
    .single('file');
}

export const handleCustomerUpload: RequestHandler = wrapMulter(buildUploader('customers'));
export const handleTicketUpload: RequestHandler = wrapMulter(buildUploader('tickets'));
```

`wrapMulter` is the existing `handleUpload` body (~lines 58–65) extracted so both exports share the 413 translation. Note the added `try/catch` around `ownerDir` — the original let a thrown `ValidationError` escape a multer callback, where it becomes an unhandled rejection instead of a 400.

**This changes the on-disk layout.** Existing customer files sit at `<UPLOAD_ROOT>/<customerId>/…`; new ones land at `<UPLOAD_ROOT>/customers/<customerId>/…`. See **Migration / Rollback** — this must be handled, not ignored.

**Update the customer call sites:** `customers.routes.ts` imports `handleUpload`, `customerDir`, and `UPLOAD_ROOT` (~lines 21). Point them at the new module, swap `handleUpload` → `handleCustomerUpload` and `customerDir(id)` → `ownerDir('customers', id)`. Customer behaviour must not change in any other way.

### 2 — Ticket attachment entity

**Create file: `backend-nodejs/src/modules/tickets/ticketAttachment.entity.ts`**

Mirror `customerAttachment.entity.ts` field for field, swapping `customerId` for `ticketId`. Keep `sizeBytes` as **`string`**.

```ts
@Entity('TicketAttachments')
@Index(['ticketId'])
export class TicketAttachment extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  ticketId!: string;

  @ManyToOne(() => Ticket, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'uniqueidentifier' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy?: User;

  /** User-supplied. Display only — never used to build a filesystem path. */
  @Column({ type: 'nvarchar', length: 255 })
  originalName!: string;

  /** Generated UUID plus a sanitised extension. The only name on disk. */
  @Column({ type: 'nvarchar', length: 255 })
  storedName!: string;

  @Column({ type: 'nvarchar', length: 150 })
  mimeType!: string;

  /** The mssql driver returns bigint as a string; typing it as number silently truncates. */
  @Column({ type: 'bigint' })
  sizeBytes!: string;
}
```

### 3 — Migration

**Create file: `backend-nodejs/src/database/migrations/1762000000000-TicketAttachments.ts`**

Follow `1759000000000-CustomerAttachments.ts`.

```ts
await queryRunner.query(`
  CREATE TABLE [TicketAttachments] (
    [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
    [ticketId] uniqueidentifier NOT NULL,
    [uploadedByUserId] uniqueidentifier NOT NULL,
    [originalName] nvarchar(255) NOT NULL,
    [storedName] nvarchar(255) NOT NULL,
    [mimeType] nvarchar(150) NOT NULL,
    [sizeBytes] bigint NOT NULL,
    [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
    [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
    [deletedAt] datetime2 NULL,
    FOREIGN KEY ([ticketId]) REFERENCES [Tickets]([id]) ON DELETE NO ACTION,
    FOREIGN KEY ([uploadedByUserId]) REFERENCES [Users]([id]) ON DELETE NO ACTION
  )
`);
await queryRunner.query(`CREATE INDEX [IDX_TicketAttachments_ticketId] ON [TicketAttachments]([ticketId])`);
```

`down()` drops the index then the table.

### 4 — Notes service

**Create file: `backend-nodejs/src/modules/tickets/ticketNotes.service.ts`**

Copy `customerNotes.service.ts`, substituting `TicketComment` for `CustomerNote` and `ticketId` for `customerId`.

```ts
export interface PublicTicketNote {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; fullNameEn: string; fullNameAr: string } | null;
}
```

- **`listNotes(ticketId, includeInternal: boolean)`** — the second parameter is **required, not defaulted**. A default of `true` would make forgetting it leak internal notes; a default of `false` would make forgetting it hide them from staff. Forcing the caller to state its intent is the point. When `false`, add `.andWhere('c.isInternal = :isInternal', { isInternal: false })`.
- Order `createdAt DESC`, tiebreak on `id DESC`.
- Join the author with an explicit `.select([...])` of `id` / `fullNameEn` / `fullNameAr`.
- `createNote`, `updateNote`, `deleteNote` (soft), `findNoteById` — same signatures as the customer originals.

### 5 — Attachments service

**Create file: `backend-nodejs/src/modules/tickets/ticketAttachments.service.ts`**

Copy `customerAttachments.service.ts`. Keep the two behaviours that matter:

- **`createAttachment` unlinks the uploaded file if the metadata insert throws.** Multer has already written to disk by the time the service runs; without the unlink a failed insert leaves a file nothing references.
- **`softDeleteAttachment` removes the row only.** The file stays — documented under **Known limitations**.
- `listAttachments(ticketId)` — newest first, uploader projected explicitly.
- `toPublicAttachment` — never emit `storedName`. It is an internal filesystem detail and publishing it invites path probing.

### 6 — Schemas

**Create file: `backend-nodejs/src/modules/tickets/ticketChildren.schemas.ts`**

```ts
export const createTicketNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  // Default true: a working note is private unless the author opts in to sharing.
  isInternal: z.boolean().optional().default(true),
});

export const updateTicketNoteSchema = z
  .object({
    body: z.string().trim().min(1).max(4000).optional(),
    isInternal: z.boolean().optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const ticketChildParamSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
});
```

### 7 — Controller

**Create file: `backend-nodejs/src/modules/tickets/ticketChildren.controller.ts`**

Model it on `customerChildren.controller.ts`. Every handler calls `requireTicketInScope(req)` from `tickets.controller.ts` first.

- **`listNotes`** — pass `includeInternal: req.auth!.roleCode !== ROLE_CODES.CUSTOMER`. This single expression is the entire internal-note guard; test it directly.
- **`createNote`** — `authorUserId` from `req.auth!.userId`, never from the body.
- **`updateNote`** — 403 `'You can only edit your own notes'` when `note.authorUserId !== req.auth!.userId`.
- **`deleteNote`** — allow the author **or** an Administrator.
- **Child-of-parent guard**, on every `:childId` handler: load the child and 404 when `child.ticketId !== req.params.id`. Without it, a caller who can reach ticket A can edit a note belonging to ticket B by passing B's note id under A's ticket. `customerChildren.controller.ts` carries the same guard — copy it.
- **`uploadAttachment`** — build the row from `req.file` (`originalname`, `filename` → `storedName`, `mimetype`, `size` → `String(size)`). Return 201. When `req.file` is undefined (no part named `file`), throw `ValidationError({ file: 'A file is required' })`.
- **`downloadAttachment`** — resolve the row, apply the child-of-parent guard, then rebuild the path with `path.resolve(ownerDir('tickets', ticketId), row.storedName)` and **assert containment a second time** before streaming. Set `Content-Disposition: attachment; filename="…"` with the original name quote-escaped, `Content-Type` from the stored `mimeType`, and `X-Content-Type-Options: nosniff`. When the row exists but the file is missing from disk, return **404**, not a 500.
- **`deleteAttachment`** — soft delete, 204.

### 8 — Fold notes and attachments into the history timeline

**File: `backend-nodejs/src/modules/tickets/ticketHistory.service.ts`**

Story 12's `listHistory` reads `TicketHistory` alone. Extend it to merge three sources — audit rows, notes, attachments — into one newest-first timeline, using the same merge-and-slice approach as `customerHistory.service.ts` (~lines 110–126).

Widen the entry shape with a `kind` discriminator: `'audit' | 'note' | 'attachment'`. Note titles truncate at 100 chars plus an ellipsis, matching `customerHistory.service.ts` line 64.

**Internal notes must be filtered here too** — pass the same `includeInternal` flag down from the controller. A customer reading the timeline must not see through it what the notes list hides.

**Known limitation to record in a comment on the function:** this now pre-loads all three sources before slicing, so cost grows with total ticket activity rather than page size. Acceptable at current volumes; revisit with a UNION query if a ticket exceeds a few thousand entries. `customerHistory.service.ts` carries the same trade-off.

### 9 — Routes

**File: `backend-nodejs/src/modules/tickets/tickets.routes.ts`**

Append, each with an `@openapi` block:

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/:id/notes` | `TICKETS_READ` | |
| `POST` | `/:id/notes` | `TICKETS_UPDATE` | `body: createTicketNoteSchema` |
| `PATCH` | `/:id/notes/:childId` | `TICKETS_UPDATE` | author only |
| `DELETE` | `/:id/notes/:childId` | `TICKETS_UPDATE` | author or admin |
| `GET` | `/:id/attachments` | `TICKETS_READ` | |
| `POST` | `/:id/attachments` | `TICKETS_UPDATE` | `handleTicketUpload` **after** `authorize` |
| `GET` | `/:id/attachments/:childId/download` | `TICKETS_READ` | binary |
| `DELETE` | `/:id/attachments/:childId` | `TICKETS_UPDATE` | |

**`handleTicketUpload` must run after `authorize`.** Reversed, an unauthorised caller's file is written to disk before the 403 — an unauthenticated write primitive.

### 10 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

Add two notes to one demo ticket — one `isInternal: true`, one `isInternal: false` — so Story 14 can show the distinction. **Do not seed attachment rows**: a row whose file is absent from disk makes every download 404 and looks like a bug.

---

## Frontend Tasks

No frontend changes required. Notes and attachment UI are Story 14.

---

## Edge Cases & Failure Modes

- **Path traversal via `ownerId`.** A crafted `..%2f..%2fetc` in the path segment. `ownerDir` resolves and asserts the prefix (task 1); the route's `z.string().uuid()` rejects it before that. Two independent defences.
- **Path traversal via `storedName` on download.** The stored name is a server-generated UUID, and the download handler re-asserts containment after joining (task 7). A tampered database row still cannot escape `UPLOAD_ROOT`.
- **Path traversal via the uploaded filename.** `originalName` never reaches the filesystem; the on-disk name is `crypto.randomUUID()` plus an extension stripped to `[A-Za-z0-9.]`. A file called `../../evil.sh` is stored as `<uuid>.sh` and displayed by its original name.
- **SVG upload.** Rejected — absent from the allowlist. An inline-rendered SVG executes script in the app's origin. Assert its absence in a test so a future "add more image types" change cannot quietly reintroduce it.
- **File exceeds the limit.** Multer aborts and `wrapMulter` translates `LIMIT_FILE_SIZE` into **413**. Multer may already have written a partial file — accept it as an orphan; do not attempt cleanup from the error path, where the temp name is not reliably available.
- **Metadata insert fails after the file is written.** `createAttachment` unlinks it (task 5). If the unlink itself fails, log and continue — a leaked file is not worth failing an already-failing request over.
- **No `file` part in the multipart body.** `req.file` is undefined; return 400 with `details.file`, not a 500 on a property of undefined.
- **Row exists, file missing from disk.** Return 404. Reachable after a manual `uploads/` cleanup or a restore that skipped the directory.
- **Note id belongs to another ticket.** The child-of-parent guard returns 404. Without it, ticket-level scoping is bypassable via child ids.
- **Whitespace-only note body.** `.trim().min(1)` rejects it.
- **Internal note leaking to a customer.** Guarded in exactly two places — `listNotes` and the history merge (task 8). Both take the same `includeInternal` flag from the same expression in the controller. Test both; a fix applied to one and not the other is the likely regression.
- **A customer editing a note.** The `CUSTOMER` role does not hold `tickets.update`, so `authorize` rejects before any handler runs.
- **Concurrent uploads to the same ticket.** Filenames are UUIDs, so they cannot collide, and `fs.mkdir(…, { recursive: true })` is safe when two requests create the directory at once.
- **Soft-deleted attachment leaves its file.** Deliberate, and documented. Storage grows monotonically; a reaper job is future work.
- **Ticket soft-deleted with children.** Notes and attachments keep pointing at a hidden ticket and become unreachable, because every child route resolves the parent through `findById` first, which excludes soft-deleted rows.
- **The relocated upload directory.** Existing customer files are at the old path and become undownloadable unless moved. See **Migration / Rollback** — this is the highest-risk item in the story.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/common/uploads/__tests__/attachments.upload.spec.ts`.** Move and extend Story 10's version.
   - `ownerDir('tickets', '<uuid>')` resolves inside `UPLOAD_ROOT`.
   - `ownerDir` throws for `..`, an absolute path, and a path with a null byte.
   - `ownerDir('customers', id)` and `ownerDir('tickets', id)` never produce the same path for the same id.
   - The MIME allowlist accepts PDF, PNG, JPEG, and **rejects `image/svg+xml`**, `text/html`, and `application/x-msdownload`.
   - Extension sanitising: `evil.sh` → `.sh`; `x.php%00.png` keeps only safe characters; a 40-char extension is truncated to 20.
2. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/ticketChildren.schemas.spec.ts`.**
   - `createTicketNoteSchema` rejects empty and whitespace-only bodies and bodies over 4000 chars.
   - `isInternal` **defaults to `true`** when omitted.
   - `updateTicketNoteSchema` rejects `{}`.
3. **Unit — create `backend-nodejs/src/modules/tickets/__tests__/ticketAttachments.spec.ts`.**
   - `toPublicAttachment` does **not** emit `storedName`.
   - `sizeBytes` survives as a string for a value beyond 2³¹ without truncation.
4. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketNotes.itest.ts`.**
   - `authorUserId` is stamped from the token, ignoring any author field in the body.
   - A non-author gets 403 on edit; the author succeeds.
   - An Administrator can delete another user's note; a non-author non-admin cannot.
   - A note id from another ticket returns 404.
   - A `CUSTOMER`-role token does **not** see `isInternal: true` notes and **does** see internal-false ones.
   - A staff token sees both.
   - The response carries the author's name and **no** `passwordHash` — assert on raw response text.
   - Notes return newest-first.
5. **Integration — create `backend-nodejs/src/modules/tickets/__tests__/ticketAttachments.itest.ts`.**
   - Upload a small PNG → 201, `originalName` preserved, `storedName` absent from the response.
   - The file exists on disk under `<UPLOAD_ROOT>/tickets/<ticketId>/`.
   - An oversize file returns **413**.
   - An SVG returns 400.
   - A request with no `file` part returns 400 with `details.file`.
   - Download returns the exact bytes, `Content-Disposition: attachment`, and `X-Content-Type-Options: nosniff`.
   - Downloading an attachment id belonging to another ticket returns 404.
   - Deleting the file from disk then downloading returns 404, not 500.
   - Delete → 204; it disappears from the list; **the file remains on disk** (assert the documented behaviour explicitly).
   - A ticket in another branch returns 403 for both upload and download.
   - An Agent (no `users.read`) can upload and download.
6. **Integration — modify `backend-nodejs/src/modules/tickets/__tests__/ticketHistory.itest.ts`** (Story 12).
   - The timeline now merges audit rows, notes, and attachments, newest-first, each with the right `kind`.
   - A `CUSTOMER`-role caller sees **no** internal notes in the timeline.
   - A note title longer than 100 chars is truncated with an ellipsis.
   - Pagination still returns disjoint id sets across the merged set.
7. **Regression — run the full customer suite.** Task 1 relocates and rewrites the shared uploader; `customers.itest.ts` and the Story 10 attachment tests must pass **unchanged**. Any edit needed there means the refactor changed customer behaviour and is wrong.

---

## Migration / Rollback

- Run `npm run migration:run` before `npm run db:seed`.
- **The upload directory layout changes.** Before deploying, move existing customer files:
  ```bash
  # from the backend working directory, with the app stopped
  cd uploads && mkdir -p customers
  for d in */; do [ "$d" = "customers/" ] || [ "$d" = "tickets/" ] || mv "$d" customers/; done
  ```
  Files are addressed by `storedName` within the owner's directory, so moving the directories is sufficient — **no database update is required**. Verify by downloading one pre-existing customer attachment before declaring the deploy done.
  In a development environment with no attachments worth keeping, deleting `uploads/` and the `CustomerAttachments` rows together is the faster path. Do not delete one without the other.
- `down()` drops `TicketAttachments` and its rows. **Files on disk are not removed** — after a rollback, `uploads/tickets/` is orphaned and must be deleted manually.
- Rolling back does **not** restore the old upload layout. Reverse the `mv` above by hand if you also revert the code.
- Revert order across this feature: `1762000000000` → `1761000000000` → `1760000000000`.

### Known limitations

Record these in the README's **Known Limitations** section alongside Story 10's entries:

- **No virus scanning.** Uploaded files are stored as received. Do not expose this to untrusted uploaders without a scanner in front.
- **Soft-deleted attachments leave their files on disk.** Storage grows monotonically; there is no reaper.
- **A 413 may leave a partial file.** Multer writes before it enforces the limit.
- **The history timeline pre-loads all entries before paginating.** Fine at current volumes; revisit with a UNION query for very active tickets.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Seed runs:** `npm run db:seed` in `backend-nodejs/`.
4. **Unit tests:** `npm test` in `backend-nodejs/`.
5. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
6. **Backend runs:** `npm run dev` in `backend-nodejs/`, then with an admin token:
   - `POST /api/v1/tickets/<id>/notes` with `{"body":"internal check"}` → 201 and `isInternal: true`.
   - `POST /api/v1/tickets/<id>/attachments` as multipart with a small PNG → 201.
   - Confirm the file is under `backend-nodejs/uploads/tickets/<ticketId>/` with a UUID name.
   - `GET /api/v1/tickets/<id>/attachments/<attachmentId>/download` returns the original bytes.
   - Upload a 20 MB file → **413**.
   - Upload an `.svg` → 400.
   - `GET /api/v1/tickets/<id>/history` shows audit rows, the note, and the attachment interleaved newest-first.
7. **Customer regression:** download a customer attachment created **before** this story to confirm the directory move worked.
8. **Full suite:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] One hardened uploader at `backend-nodejs/src/common/uploads/attachments.upload.ts` serves both customers and tickets.
- [ ] Existing customer attachments still download after the directory move.
- [ ] The customer test suite passes **without modification**.
- [ ] `TicketAttachments` table exists and is indexed on `ticketId`.
- [ ] Ticket notes reuse the existing `TicketComments` table; no second comments table was created.
- [ ] `isInternal` defaults to `true` and internal notes are never returned to a `CUSTOMER`-role caller — in the notes list **and** in the history timeline.
- [ ] Only the author may edit a note; the author or an Administrator may delete one.
- [ ] A child id belonging to another ticket returns 404 on every child route.
- [ ] Stored filenames are generated UUIDs; `storedName` never appears in a response.
- [ ] SVG is rejected; the allowlist is unchanged from Story 10.
- [ ] Oversize uploads return 413.
- [ ] Download sets `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, and re-asserts path containment.
- [ ] A missing file on disk returns 404, not 500.
- [ ] `handleTicketUpload` runs after `authorize` on the upload route.
- [ ] The history timeline merges audit rows, notes, and attachments newest-first with a `kind` discriminator.
- [ ] Known limitations are recorded in the README.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 14.**
