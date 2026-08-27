# Story 10 — Customer Attachments & Interaction History (Customer 360) (Story: 17)

## Prerequisites

- **Story 09 completed** ([09-story-customer-contacts-notes-and-profile-17.md](09-story-customer-contacts-notes-and-profile-17.md)) — `CustomerDetailView.vue` exists with a marked placeholder for exactly this content, and the child-route pattern under `/customers/:id/…` is established.
- **Story 08 completed** ([08-story-customer-crud-and-search-17.md](08-story-customer-crud-and-search-17.md)) — the `customers.*` permissions and branch scoping.
- **`Tickets` already carries `customerId`** — `backend-nodejs/src/modules/tickets/ticket.entity.ts` (~lines 37–42), with an index on it (line 14). The interaction history reads this; **no ticket schema change is needed**.
- **A new runtime dependency is required.** The backend has no file-upload middleware today — verify with `npm ls multer` in `backend-nodejs`, which will fail before this story. This is the only story in the feature that adds a dependency.

---

## Story Goal

Complete the Customer 360 view:

1. **Customer attachments** — upload, list, download, and remove files against a customer, stored on disk with database metadata.
2. **Interaction history** — a single reverse-chronological timeline merging the customer's **tickets**, **notes**, and **attachments**.
3. **Customer 360 UI** — both surfaces slotted into the placeholder Story 09 left in the profile screen.
4. **The ticket relationship, proven** — a test that a customer's tickets appear in their history and that a customer with no tickets renders an empty timeline rather than an error.

**Not in scope:**
- Virus scanning. Files are stored as received. **This must be stated in the README as a known limitation**, not left implicit.
- Cloud/object storage. Local disk only, behind a configurable root so a later swap is contained.
- Image thumbnails or previews. Download only.
- Editing a ticket from the timeline — entries link out; ticket management is its own feature.
- Attachments on notes or contacts. Attachments belong to the **customer**.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — all 70 lines. `customerId` (~lines 37–42), `ticketNumber`, `subject`, `statusId`, and the `TicketStatus` relation (~lines 51–56) that the timeline needs for a readable label.
2. `backend-nodejs/src/modules/tickets/ticketStatus.entity.ts` — the bilingual `nameEn`/`nameAr` the timeline renders through `useLocalizedName`.
3. `backend-nodejs/src/modules/customers/customerNotes.service.ts` — created in Story 09. The timeline reuses its `PublicNote` shape rather than re-querying notes differently.
4. `backend-nodejs/src/modules/customers/customerChildren.controller.ts` — created in Story 09. Its `requireCustomerInScope` helper is what every route here must call first. **Reuse it; do not re-implement.**
5. `backend-nodejs/src/app.ts` — all 66 lines. Note `express.json({ limit: '1mb' })` on line 28 (multipart bypasses it), `helmet()` on line 17, and the `/api` rate limiter on ~lines 38–42.
6. `backend-nodejs/src/config/env.ts` — all 32 lines. The Zod-validated env pattern; new upload variables go in this schema and nowhere else.
7. `backend-nodejs/src/common/errors/AppError.ts` — all 32 lines. `ValidationError` is 422; there is **no** 413 subclass, so oversize uploads need an explicit mapping.
8. `frontend-vuejs/src/api/client.ts` — all 136 lines. **Critical:** `apiCall` hard-codes `'Content-Type': 'application/json'` (~line 51) and `JSON.stringify`s object bodies (~lines 59–61). It **cannot** send `FormData` or receive a binary body as written. See task 6.
9. `frontend-vuejs/src/composables/useFormat.ts` — ~lines 44–47 (`formatDateTime`) and ~lines 49–51 (`formatNumber`, for file sizes).
10. `frontend-vuejs/src/views/CustomerDetailView.vue` — created in Story 09; find the placeholder comment.
11. `backend-nodejs/.env.example` — add the new variables here too, or a fresh clone starts with no upload directory.

Grep targets:
- Grep for `requireCustomerInScope` in `backend-nodejs/src/modules/customers/` to confirm the Story 09 helper's exact signature before importing it.
- Grep for `express.json` in `backend-nodejs/src/` to confirm the body-parser limit does not apply to multipart routes.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Size limit** | 10 MB per file, configurable. Rejected with **413**, not a generic 500. |
| **Type allowlist** | PDF, PNG, JPEG, GIF, WebP, plain text, CSV, and the Office/OpenDocument formats. Everything else is rejected. |
| **Storage** | Local disk under a configured root, in a per-customer subdirectory, under a **generated** filename. The original name is metadata only and never touches the filesystem. |
| **Serving** | Always `Content-Disposition: attachment` plus `X-Content-Type-Options: nosniff`. Never inline. |
| **Permissions** | Listing and downloading need `customers.read`; uploading and deleting need `customers.update`. **No new permission codes.** |
| **Deletion** | Soft-deletes the metadata row; the file stays on disk. Reclaiming disk is a separate, auditable operation. |
| **Timeline** | Merges tickets, notes, and attachments, newest first, paginated. Each entry carries a `kind` discriminator. |
| **Scope** | Every route re-checks the parent customer's branch, exactly as Story 09 does. |

---

## Backend Tasks

### 1 — Dependency and configuration

```bash
cd backend-nodejs
npm install multer
npm install --save-dev @types/multer
```

**File: `backend-nodejs/src/config/env.ts`** — add to the Zod schema (~lines 4–21):

```ts
  // File uploads — customer attachments
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
```

**File: `backend-nodejs/.env.example`** — document both, with a comment that `UPLOAD_DIR` is resolved relative to the backend working directory and **must not** be inside `src/` (tsx watch would restart on every upload).

**File: `.gitignore`** — add `uploads/`. Committing customer files would be a data leak; verify with `git status` after an upload that nothing is staged.

### 2 — Entity and migration

**Create file: `backend-nodejs/src/modules/customers/customerAttachment.entity.ts`**

```ts
@Entity('CustomerAttachments')
@Index(['customerId'])
export class CustomerAttachment extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'uniqueidentifier' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy?: User;

  /** The name the user's browser supplied. Display only — never used as a path. */
  @Column({ type: 'nvarchar', length: 255 })
  originalName!: string;

  /** The generated name on disk, relative to the customer's directory. */
  @Column({ type: 'nvarchar', length: 255 })
  storedName!: string;

  @Column({ type: 'nvarchar', length: 150 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;
}
```

`bigint` maps to **string** in the mssql driver, not number. Type it `string` and convert at the boundary — typing it `number` compiles but silently yields a string at runtime.

**Create file: `backend-nodejs/src/database/migrations/1759000000000-CustomerAttachments.ts`** — one table, FKs to `Customers` and `Users` both `ON DELETE NO ACTION`, index on `customerId`, and a real `down()`.

### 3 — Upload middleware

**Create file: `backend-nodejs/src/modules/customers/attachments.upload.ts`**

```ts
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../../config/env';
import { ValidationError } from '../../common/errors/AppError';

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
]);

/**
 * Resolves the directory for one customer's files and asserts it stays inside
 * UPLOAD_ROOT. `customerId` is uuid-validated upstream, so this is defence in
 * depth — but a path check costs nothing and a traversal bug costs everything.
 */
export function customerDir(customerId: string): string {
  const dir = path.resolve(UPLOAD_ROOT, customerId);
  if (dir !== UPLOAD_ROOT && !dir.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new ValidationError({ customerId: 'Invalid storage path' });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = customerDir(req.params.id);
    fs.mkdir(dir, { recursive: true }, err => cb(err, dir));
  },
  filename: (_req, file, cb) => {
    // The original name is never used on disk. A generated name removes every
    // traversal, collision, reserved-name, and unicode-normalisation concern at
    // once; the real name is preserved in the database for display.
    const ext = path.extname(file.originalname).slice(0, 20).replace(/[^A-Za-z0-9.]/g, '');
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadAttachment = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError({ file: `Unsupported file type: ${file.mimetype}` }));
      return;
    }
    cb(null, true);
  },
}).single('file');
```

**Multer's `LIMIT_FILE_SIZE` error must be translated**, or it surfaces as a 500. Wrap the middleware:

```ts
export const handleUpload: RequestHandler = (req, res, next) => {
  uploadAttachment(req, res, err => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'File exceeds the maximum upload size', 'PAYLOAD_TOO_LARGE'));
    }
    next(err);
  });
};
```

`AppError` takes `(statusCode, message, code, details?)` — confirm against `backend-nodejs/src/common/errors/AppError.ts` lines 1–12 before writing this.

### 4 — Attachments service and routes

**Create file: `backend-nodejs/src/modules/customers/customerAttachments.service.ts`**

- `listAttachments(customerId)` — newest first, uploader joined and mapped explicitly (same rule as Story 09: never spread a `User`).
- `createAttachment(customerId, userId, file)` — inserts the metadata row. **If the insert throws, unlink the file multer already wrote**, or every failed upload leaves an orphan:

```ts
try {
  saved = await attachments().save(row);
} catch (err) {
  await fs.promises.unlink(file.path).catch(() => {});   // best effort; the row is what matters
  throw err;
}
```

- `findAttachmentById(id)` — throws `NotFoundError('Attachment')`.
- `softDeleteAttachment(id)` — removes the metadata row only. The file is deliberately left; say so in a comment.

**File: `backend-nodejs/src/modules/customers/customers.routes.ts`** — append:

```
GET    /:id/attachments                    customers.read
POST   /:id/attachments                    customers.update   (handleUpload)
GET    /:id/attachments/:childId/download  customers.read
DELETE /:id/attachments/:childId           customers.update
GET    /:id/history                        customers.read
```

`handleUpload` runs **after** `authenticate` and `authorize` — never write a file to disk for a caller who is about to be rejected.

**Download handler** — the security-critical one:

```ts
const download: RequestHandler = async (req, res, next) => {
  try {
    const customer = await requireCustomerInScope(req);
    const attachment = await findAttachmentById(req.params.childId);
    if (attachment.customerId !== customer.id) throw new NotFoundError('Attachment');

    const filePath = path.resolve(customerDir(customer.id), attachment.storedName);
    // storedName is generated, but re-assert containment: this is the one place
    // a database value becomes a filesystem path.
    if (!filePath.startsWith(customerDir(customer.id) + path.sep)) {
      throw new NotFoundError('Attachment');
    }
    if (!fs.existsSync(filePath)) throw new NotFoundError('Attachment');

    // Force a download and forbid MIME sniffing — an uploaded .svg or .html
    // rendered inline would execute in the app's origin.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', attachment.mimeType);
    res.download(filePath, attachment.originalName);
  } catch (err) {
    next(err);
  }
};
```

`res.download` handles the `Content-Disposition` encoding for non-ASCII names, so an Arabic filename survives without manual escaping.

### 5 — Interaction history

**Create file: `backend-nodejs/src/modules/customers/customerHistory.service.ts`**

```ts
export type HistoryKind = 'ticket' | 'note' | 'attachment';

export interface HistoryEntry {
  kind: HistoryKind;
  id: string;
  occurredAt: Date;
  title: string;                                   // ticket subject, note excerpt, file name
  reference: string | null;                        // ticketNumber for tickets, else null
  statusEn: string | null;                         // ticket status only
  statusAr: string | null;
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null;
}
```

Query the three sources **separately** and merge in JavaScript. A SQL `UNION` across three differently-shaped tables would need placeholder columns and casts, and would be harder to extend when Story 11 adds a fourth source.

```ts
export async function getHistory(
  customerId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: HistoryEntry[]; total: number; page: number; pageSize: number }> {
  const [tickets, notes, files] = await Promise.all([
    ticketEntries(customerId),
    noteEntries(customerId),
    attachmentEntries(customerId),
  ]);

  const merged = [...tickets, ...notes, ...files].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );

  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: merged.slice(start, start + pageSize),
    total: merged.length,
    page,
    pageSize,
  };
}
```

**This loads every entry before paginating.** That is correct for the volumes this system holds and keeps the merge honest, but it does not scale indefinitely — record it under Known Limitations rather than leaving it for someone to discover.

Note excerpts must be truncated for the timeline (100 characters plus an ellipsis); the full body already has its own section on the profile.

Ticket entries join `TicketStatus` for `nameEn`/`nameAr`. Because a soft-deleted customer's tickets remain, and this endpoint 404s on a deleted customer first, no `withDeleted()` is needed here.

### 6 — Frontend API client must handle multipart and binary

**File: `frontend-vuejs/src/api/client.ts`**

As written, `apiCall` sets `'Content-Type': 'application/json'` (~line 51) and `JSON.stringify`s object bodies (~lines 59–61). Passing a `FormData` through it produces `[object Object]` with a JSON content type — the upload fails in a way that looks like a server bug. **This is a real blocker, not a nicety.**

Make two contained changes:

```ts
// Let the browser set multipart/form-data itself — it must append the boundary,
// which we cannot compute here.
const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

const fetchOptions: RequestInit = {
  ...options,
  headers: {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept': 'application/json',
    'x-correlation-id': correlationId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  },
};

if (options.body && typeof options.body === 'object' && !isFormData) {
  fetchOptions.body = JSON.stringify(options.body);
}
```

Preserve the existing 401 handling and `ApiError` shape exactly — `src/api/__tests__/client.spec.ts` already pins them.

Add two methods to the `api` object (~lines 127–136):

```ts
upload: <T = any>(endpoint: string, formData: FormData) =>
  apiCall<T>(endpoint, { method: 'POST', body: formData }),
```

Downloads must **not** go through `apiCall` — it requires a JSON content type (~lines 77–85) and would reject a PDF. Add a separate function that fetches with the bearer token, reads a `Blob`, and triggers a save via an object URL, revoking it afterwards.

### 7 — Customer 360 UI

**File: `frontend-vuejs/src/views/CustomerDetailView.vue`** — replace the Story 09 placeholder with two cards:

**Attachments** — a table of file name, size (`formatNumber` over KB/MB), uploader, date, and Download / Delete actions. Upload is a file input plus a progress-disabled button, shown under `customers.update`; delete asks for confirmation. Show the accepted types and the size cap **before** the user picks a file, and validate size client-side so a 50 MB file is refused instantly instead of after a long upload. The server limit remains authoritative.

**Interaction history** — a timeline, newest first, one row per entry with an icon per `kind`, `formatDateTime(entry.occurredAt)`, the title, and for tickets the `reference` and a localized status badge. Ticket entries link to the ticket route **if one exists**; if the tickets feature has no route yet, render them as plain text and leave a comment — do not invent a route name that will silently 404 in the guard.

Paginate with a "load more" button appending to the list, and render a distinct empty state for a customer with no history at all.

### 8 — Translations and README

Add to **both** `en.json` and `ar.json`: `customers.attachments.*` (`title`, `upload`, `download`, `delete`, `confirmDelete`, `maxSize`, `allowedTypes`, `columns.*`, `empty.*`, `errors.tooLarge`, `errors.unsupportedType`) and `customers.history.*` (`title`, `loadMore`, `kind.ticket`, `kind.note`, `kind.attachment`, `empty.*`).

**File: `README.md`** — add `UPLOAD_DIR` and `MAX_UPLOAD_BYTES` to the configuration notes, and add to **Known Limitations**:

- Uploaded files are **not virus-scanned**.
- Deleting an attachment leaves the file on disk; reclaiming space is manual.
- The interaction history loads all entries before paginating.

---

## Edge Cases & Failure Modes

- **Path traversal via `customerId` or `storedName`** — both are uuid/generated, and `customerDir()` plus the download handler re-assert containment against `UPLOAD_ROOT`. Two independent checks, because this is the one place a stored value becomes a filesystem path.
- **Hostile original filename** (`../../etc/passwd`, `CON.txt`, a 300-character unicode name) — never touches disk. Only the generated UUID name does, and the extension is stripped to `[A-Za-z0-9.]`.
- **Uploaded SVG or HTML rendered inline** — would execute in the app's origin. Prevented by `Content-Disposition: attachment` via `res.download` plus `X-Content-Type-Options: nosniff`. SVG is also absent from the allowlist. **Do not add it** without a sanitizer.
- **File exceeds the limit** — multer raises `LIMIT_FILE_SIZE`; `handleUpload` maps it to **413**. Without that mapping it is an unhandled 500.
- **Disallowed MIME type** — `fileFilter` rejects with `ValidationError` → 422, and no file is written.
- **`mimetype` is client-supplied** — the allowlist is a usability guard, not a security boundary. `Content-Disposition: attachment` is the actual defence, which is why both exist.
- **Database insert fails after the file is written** — `createAttachment` unlinks the file before rethrowing. Without this every failed upload leaks a file.
- **Attachment row exists but the file is missing** (manual deletion, restored database) — the download handler returns 404 rather than throwing an unhandled `ENOENT`.
- **Attachment id from another customer** — `attachment.customerId !== customer.id` returns 404, the same guard Story 09 applies to notes. Test it.
- **Cross-branch upload** — `requireCustomerInScope` runs before `handleUpload`, so no file is written for a caller who is then rejected. Middleware **order** is what enforces this.
- **Concurrent uploads to the same customer** — `fs.mkdir(..., { recursive: true })` is safe when the directory already exists, and UUID names cannot collide.
- **`sizeBytes` as `bigint`** — the mssql driver returns a **string**. Typing it `number` compiles and then produces `"1048576"` where arithmetic is expected. Convert explicitly at the API boundary.
- **Customer with no tickets, notes, or attachments** — `getHistory` returns an empty `items` array with `total: 0`. The UI shows an empty state; it must not error. **This is the explicit "ticket relationship" test the intake asks for, in its zero case.**
- **Ticket and note created in the same millisecond** — the sort is not stable across kinds and the order between them is arbitrary. Acceptable; do not add a synthetic tiebreaker that implies a precision the data lacks.
- **Deactivated uploader** — the attachment keeps its `uploadedByUserId` and still renders the name, matching the Story 09 rule for note authors.
- **`UPLOAD_DIR` not writable** — the first upload fails with `EACCES` as a 500. Acceptable for a misconfigured server, but the README must name the variable so the cause is findable.
- **`uploads/` committed to git** — prevented by the `.gitignore` entry. Verify with `git status` after an upload.

---

## Test Plan

1. **`backend-nodejs/src/modules/customers/__tests__/attachments.upload.spec.ts`** (new, unit — no database)
   - `customerDir()` returns a path inside `UPLOAD_ROOT` for a valid uuid.
   - `customerDir('../../etc')` throws `ValidationError`.
   - The MIME allowlist accepts `application/pdf` and rejects `image/svg+xml` and `text/html`.
   - The filename generator strips path separators and non-alphanumeric characters from the extension, and returns a name containing no `/` or `\`.

2. **`backend-nodejs/src/modules/customers/__tests__/customerHistory.spec.ts`** (new, unit)
   - Merging three pre-built arrays yields strict newest-first order.
   - Pagination slices correctly and `total` reflects the **unpaged** count.
   - Page 2 of a 3-item set with `pageSize: 2` returns exactly 1 item.
   - An all-empty input yields `{ items: [], total: 0 }` and does not throw.
   - Note titles are truncated to 100 characters with an ellipsis.

3. **`backend-nodejs/src/modules/customers/__tests__/customerAttachments.itest.ts`** (new, integration)
   - Upload a small PDF → 201, metadata row created, file present on disk.
   - Upload an oversize file → **413**.
   - Upload a disallowed type → **422**, and **no** file written.
   - Download returns the bytes with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
   - Download an attachment id belonging to another customer → **404**.
   - Delete → 204; a subsequent list omits it; the file remains on disk (asserting the documented behaviour).
   - A manager uploading to another branch's customer → **403**, and no file written.
   - An agent (holds `customers.update`) can upload; a `CUSTOMER`-role token → 403.
   - Clean up the temporary upload root in `afterAll`.

4. **`backend-nodejs/src/modules/customers/__tests__/customerHistory.itest.ts`** (new, integration) — **this is the intake's "ticket relationship" test**
   - A customer with tickets, notes, and attachments returns all three kinds.
   - Entries are newest-first across kinds.
   - Ticket entries carry `reference` (the `ticketNumber`) and a non-null status.
   - A customer with **no** tickets returns only notes and attachments, and does not error.
   - A customer with nothing returns `{ items: [], total: 0 }`.
   - A manager requesting another branch's customer history → 403.

5. **`frontend-vuejs/src/api/__tests__/client.spec.ts`** (**modify**)
   - A `FormData` body is passed through **unstringified**.
   - No `Content-Type` header is set for `FormData` (the browser must add the boundary).
   - A JSON body still gets `application/json` and is still stringified — the existing assertions must continue to pass unchanged.

6. **`frontend-vuejs/src/views/__tests__/CustomerDetailView.spec.ts`** (**modify**, from Story 09)
   - Renders the attachment list with formatted sizes.
   - Rejects an oversize file client-side without calling the API.
   - Upload and delete controls are hidden without `customers.update`.
   - Renders a timeline with one row per entry and the right icon per `kind`.
   - Renders the distinct empty state for a customer with no history.
   - "Load more" appends rather than replacing.

---

## Migration / Rollback

- **Apply:** `npm install multer`, then `npm run migration:run`, then create the upload directory (the middleware creates per-customer subdirectories, but the root must exist or be creatable).
- **Rollback:** `npm run migration:revert` drops `CustomerAttachments`. **Files on disk are not removed** — the metadata is gone but the bytes remain, which is the safe direction. Removing `UPLOAD_DIR` is a separate manual step.
- **Half-applied state:** if the migration ran but `multer` is not installed, the app fails at import with a module-not-found error before serving. Install and restart; no data is at risk.
- **Reverting with files present** leaves orphans with no database reference. Note this in the migration's `down()` as a comment so the next person is not surprised.

---

## Verification Steps

1. **Dependency installed:** `npm ls multer` in `backend-nodejs` resolves.
2. **Migration applies:** `npm run migration:run`.
3. **Backend unit tests:** `npm test` in `backend-nodejs`.
4. **Backend integration tests:** `npm run test:integration` in `backend-nodejs`.
5. **Backend builds:** `npm run build` in `backend-nodejs` → exits 0.
6. **Frontend tests:** `npm test` in `frontend-vuejs` — including the unmodified client assertions.
7. **Frontend builds:** `npm run build` in `frontend-vuejs`.
8. **Manual — upload:** as `admin@azm.local`, open a customer profile, upload a small PDF → it appears with the correct size and uploader.
9. **Manual — download:** click Download → the browser **saves** the file rather than displaying it, and the content matches.
10. **Manual — limits:** attempt a >10 MB file → a size message, no upload. Attempt a `.exe` → an unsupported-type message.
11. **Manual — history:** open a customer that has tickets → tickets, notes, and attachments interleave newest-first with correct badges.
12. **Manual — empty history:** open a freshly created customer → the empty state, no error.
13. **Manual — scoping:** as `manager@azm.local`, request a Riyadh customer's history directly → 403, and confirm no file was written under `UPLOAD_DIR`.
14. **Manual — Arabic:** switch to Arabic, confirm the timeline mirrors, dates localize, and file names stay left-to-right. Upload a file with an Arabic name and download it — the name must survive the round trip.
15. **Git hygiene:** after uploading, `git status` shows **nothing** under `uploads/`.
16. **Swagger:** the five new paths appear under **Customers**.
17. **Regression:** Stories 08 and 09 surfaces — list, search, profile, contacts, notes — all still work.

---

## Done Criteria

- [ ] `multer` and `@types/multer` are installed and recorded in `package.json`.
- [ ] `UPLOAD_DIR` and `MAX_UPLOAD_BYTES` are validated in `env.ts` and documented in `.env.example`.
- [ ] `uploads/` is git-ignored and verified absent from `git status` after an upload.
- [ ] `CustomerAttachment` entity and migration `1759000000000-CustomerAttachments.ts` exist, with a working `down()`.
- [ ] `sizeBytes` is typed as `string`, matching what the mssql driver returns for `bigint`.
- [ ] Files are stored under a generated UUID name; the original name is metadata only.
- [ ] `customerDir()` asserts containment within `UPLOAD_ROOT`, and the download handler re-asserts it.
- [ ] Oversize uploads return **413**; disallowed types return **422** with no file written.
- [ ] Downloads send `Content-Disposition: attachment` **and** `X-Content-Type-Options: nosniff`; SVG is not in the allowlist.
- [ ] A failed metadata insert unlinks the already-written file.
- [ ] An attachment id belonging to another customer returns 404.
- [ ] `handleUpload` runs after `authenticate`, `authorize`, and the branch check, so a rejected caller never writes a file.
- [ ] `GET /:id/history` merges tickets, notes, and attachments newest-first, paginated, each with a `kind`.
- [ ] Ticket entries carry `ticketNumber` and a bilingual status.
- [ ] A customer with no tickets returns a valid, non-error history.
- [ ] `api/client.ts` sends `FormData` unstringified and without a forced `Content-Type`, and existing JSON behaviour and 401 handling are unchanged.
- [ ] Binary downloads bypass `apiCall` and revoke their object URL.
- [ ] The profile screen shows attachments and the timeline in the slot Story 09 reserved.
- [ ] Client-side size validation refuses an oversize file before uploading.
- [ ] All new strings are in both `en.json` and `ar.json`; `locale-parity.spec.ts` passes.
- [ ] README documents the upload variables and the three known limitations, including **no virus scanning**.
- [ ] Backend and frontend tests and both builds pass; Stories 01–09 show no regressions.

**Story 17 (US03) is complete when this story's criteria are met. Report to the user before starting the next work item.**
