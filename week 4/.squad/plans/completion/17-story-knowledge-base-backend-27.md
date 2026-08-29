# Story 17 — Knowledge Base & FAQ Backend (Story: 27)

## Prerequisites

- **Story 15 completed** ([15-story-crm-foundation-channel-customer-link-and-audit-27.md](15-story-crm-foundation-channel-customer-link-and-audit-27.md)) — `kb.read` and `kb.manage` exist in `PERMISSIONS` and are seeded; `recordAudit` exists; `AUDIT_ACTIONS.KB_ARTICLE_PUBLISHED` / `KB_ARTICLE_UNPUBLISHED` and `AUDIT_ENTITY_TYPES.KB_ARTICLE` / `KB_CATEGORY` exist; the named `app` export makes integration tests runnable.
- **Story 08 completed** ([../customer-management/08-story-customer-crud-and-search-17.md](../customer-management/08-story-customer-crud-and-search-17.md)) — `customers.service.ts` is the **search-and-page service pattern** this story copies, including the `LIKE`-escaping in `listCustomers`.
- **Story 11 completed** ([../ticket/11-story-ticket-data-model-creation-and-search-18.md](../ticket/11-story-ticket-data-model-creation-and-search-18.md)) — the module layout (`*.entity.ts` / `*.service.ts` / `*.controller.ts` / `*.routes.ts` / `*.schemas.ts`) every new module follows.

**This story is backend-only.** Knowledge Base screens are Story 22.

---

## Story Goal

A lightweight, bilingual Knowledge Base that both agents and customers can read:

1. **Two tables** — `KbCategories` and `KbArticles` — with bilingual title and body.
2. **Publish / unpublish** as an explicit, audited action, not a silent field edit.
3. **Basic search and category filtering** using a plain SQL `LIKE`, paged. **No full-text index, no search engine.**
4. **A read surface split by audience** — staff with `kb.manage` see drafts; everyone else, including customers, sees **published only**.
5. **A ticket-workspace lookup** — a compact endpoint an agent can call from a ticket to find relevant articles.

**Not in scope:**
- Rich text, attachments, images, or versioning on articles. The body is plain `nvarchar(max)`.
- Article ratings, view counters, or "was this helpful".
- Relevance ranking beyond title-before-body ordering. **No scoring model.**
- Linking an article to a ticket as a stored relation.
- Any frontend → Story 22.

---

## Context — Read These Files First

1. `backend-nodejs/src/modules/tickets/ticketCategory.entity.ts` — the whole file (18 lines). `KbCategory` is its near-twin: `code`, `nameEn`, `nameAr`, `sortOrder`, plus an `isActive` flag.
2. `backend-nodejs/src/modules/tickets/ticket.entity.ts` — ~lines 60–78. The `@ManyToOne` + `@JoinColumn` + nullable-FK shape `KbArticle.categoryId` copies.
3. `backend-nodejs/src/modules/customers/customers.service.ts` — the whole file (165 lines). The pattern this story mirrors end to end: `PublicCustomer` (~lines 5–17), `ListCustomersFilter` (~lines 37–43), `PagedCustomers` (~lines 45–50), `listCustomers` (~lines 86–110), `softDeleteCustomer` (~lines 158–165).
4. `backend-nodejs/src/modules/tickets/tickets.service.ts` — `listTickets` (~lines 162–205). **~Lines 183–189 hold the `LIKE`-escaping this story must copy verbatim:**
   ```ts
   const term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
   ```
   Without it, a customer typing `100%` silently matches every article.
5. `backend-nodejs/src/modules/tickets/tickets.routes.ts` — ~lines 24–39 and ~lines 104–133. The `authenticate` → `authorize` → `validate` → handler layering, and the ordering rule: **`/assignable-users` is registered above `/:id`** so a literal segment is not swallowed by the param route. `kb.routes.ts` has the same hazard with `/categories`.
6. `backend-nodejs/src/modules/tickets/tickets.controller.ts` — `isUnscoped` (~lines 22–24) for the role-check idiom, and `history` (~line 210) for how `req.auth?.roleCode` already drives an audience decision (`includeInternal`).
7. `backend-nodejs/src/common/audit/audit.service.ts` (created in Story 15) — `recordAudit(manager, input)`, used for publish and unpublish.
8. `backend-nodejs/src/modules/tickets/tickets.schemas.ts` — the whole file (54 lines). Zod idioms to copy: `z.string().uuid()` params, `z.coerce.number().int().min(1)` paging, the `.refine(data => Object.keys(data).length > 0, …)` on a patch body (~line 21).
9. `backend-nodejs/src/routes/v1.ts` — ~lines 8–17. One `v1.use` line per module; this story adds one.
10. `backend-nodejs/src/database/migrations/1762000000000-TicketAttachments.ts` — the migration style.
11. `backend-nodejs/src/database/seed.ts` — ~lines 48–55 (the category loop). Task 7 seeds KB categories and a handful of demo FAQs in the same style.

Grep targets:
- Grep for `replace(/\[\[\\]%_]/g` — actually grep for `ch => ` in `backend-nodejs/src/modules/` to locate every existing `LIKE`-escape site and copy the exact expression rather than retyping it.
- Grep for `authorize(PERMISSIONS.` in `backend-nodejs/src/modules/` to see every existing gate before adding new ones.

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **Audience** | A caller holding `kb.manage` sees drafts and published articles. Every other caller — Agent, Customer — sees **published only**, enforced in the **service**, not the controller. |
| **Publish is an action** | `POST /:id/publish` and `POST /:id/unpublish`. `isPublished` is **not** writable through the generic `PATCH`. |
| **Publish stamps** | Publishing sets `publishedAt` and `publishedByUserId`. Unpublishing clears `isPublished` but **keeps** both stamps as the record of when it was last live. |
| **Bilingual** | `titleEn` / `titleAr` and `bodyEn` / `bodyAr` are all required. A one-language article is not creatable — parity is enforced at the schema. |
| **Search** | One `LIKE` over `titleEn`, `titleAr`, `bodyEn`, `bodyAr`, with the wildcard characters escaped. Case sensitivity follows the database collation and is not overridden. |
| **Ordering** | Title matches before body matches, then `sortOrder ASC`, then `updatedAt DESC`. That is the whole ranking model. |
| **Category filter** | By `categoryId`. An article's category is **nullable** — an uncategorised FAQ is legal and appears in unfiltered results. |
| **Delete** | Soft delete only, via `@DeleteDateColumn`. A deleted article never appears in any read, published or not. |
| **Slug** | Unique, lowercase, generated from `titleEn` when omitted. It exists for stable linking, not for routing logic. |
| **Audit** | Publish and unpublish write audit rows. Ordinary content edits do not — an audit row per typo would drown the log. |

---

## Backend Tasks

### 1 — Constants

**Create file: `backend-nodejs/src/modules/kb/kb.constants.ts`**

```ts
/** Seeded KB categories. Codes are stable; names are editable through the API. */
export const KB_CATEGORY_CATALOGUE = [
  { code: 'GETTING_STARTED', nameEn: 'Getting Started', nameAr: 'البداية', sortOrder: 0 },
  { code: 'ACCOUNT', nameEn: 'Account & Billing', nameAr: 'الحساب والفوترة', sortOrder: 1 },
  { code: 'TECHNICAL', nameEn: 'Technical Help', nameAr: 'المساعدة التقنية', sortOrder: 2 },
  { code: 'POLICIES', nameEn: 'Policies', nameAr: 'السياسات', sortOrder: 3 },
];

/** Max length of the generated excerpt returned by list endpoints. */
export const KB_EXCERPT_LENGTH = 200;
```

### 2 — Entities

**Create file: `backend-nodejs/src/modules/kb/kbCategory.entity.ts`**

Copy `ticketCategory.entity.ts` exactly and add `@Column({ type: 'bit', default: true }) isActive!: boolean;`.

**Create file: `backend-nodejs/src/modules/kb/kbArticle.entity.ts`**

```ts
@Entity('KbArticles')
@Index(['slug'], { unique: true })
@Index(['categoryId'])
@Index(['isPublished'])
export class KbArticle extends BaseEntity {
  @Column({ type: 'nvarchar', length: 200, unique: true })
  slug!: string;

  /** Nullable: an uncategorised FAQ is legal and shows in unfiltered results. */
  @Column({ type: 'uniqueidentifier', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => KbCategory, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'categoryId' })
  category?: KbCategory | null;

  @Column({ type: 'nvarchar', length: 300 })
  titleEn!: string;

  @Column({ type: 'nvarchar', length: 300 })
  titleAr!: string;

  /** Plain text. Rich content, images, and versioning are out of scope. */
  @Column({ type: 'nvarchar', length: 'MAX' })
  bodyEn!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  bodyAr!: string;

  @Column({ type: 'bit', default: false })
  isPublished!: boolean;

  /** Kept after an unpublish, as the record of when the article was last live. */
  @Column({ type: 'datetime2', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId?: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'publishedByUserId' })
  publishedBy?: User | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
```

`isPublished` defaults to **false** — a newly created article is a draft. That is what makes publishing a deliberate act.

### 3 — Service

**Create file: `backend-nodejs/src/modules/kb/kb.service.ts`**

Types, mirroring `customers.service.ts` (~lines 5–50):

```ts
export interface PublicKbArticle {
  id: string;
  slug: string;
  categoryId: string | null;
  category: { id: string; code: string; nameEn: string; nameAr: string } | null;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  isPublished: boolean;
  publishedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** List rows carry an excerpt instead of the full body — a 50 KB FAQ must not
 *  be shipped 20 times per page. */
export type PublicKbArticleSummary = Omit<PublicKbArticle, 'bodyEn' | 'bodyAr'> & {
  excerptEn: string;
  excerptAr: string;
};

export interface ListArticlesFilter {
  q?: string;
  categoryId?: string;
  /** Only a caller with kb.manage may set this. Defaults to published-only. */
  includeUnpublished?: boolean;
  page?: number;
  pageSize?: number;
}
```

Exported functions:

- **`listCategories(includeInactive: boolean): Promise<KbCategory[]>`** — ordered by `sortOrder ASC`, then `code ASC`.
- **`createCategory` / `updateCategory` / `setCategoryActive`** — gated on `kb.manage` at the route. A category is **never hard-deleted**; deactivation is the removal mechanism, so articles keep a valid FK.
- **`listArticles(filter): Promise<{ items: PublicKbArticleSummary[]; total: number; page: number; pageSize: number }>`**
  - Base query left-joins `category`.
  - `if (!filter.includeUnpublished) qb.andWhere('a.isPublished = :p', { p: true })` — **this line is the entire audience guard; it belongs in the service so no controller can forget it.**
  - `categoryId` → one `andWhere`.
  - `q` → the escaped `LIKE` from `tickets.service.ts` (~lines 183–189) across the four text columns.
  - Ordering: a computed `CASE WHEN a.titleEn LIKE :term OR a.titleAr LIKE :term THEN 0 ELSE 1 END` as the primary sort when `q` is present, then `a.sortOrder ASC`, then `a.updatedAt DESC`, then `a.id ASC` as the deterministic tiebreak.
  - Paging via `skip`/`take` with the same clamps as `listTickets` (~lines 163–164).
- **`findArticleById(id, includeUnpublished): Promise<KbArticle>`** — throws `NotFoundError('KbArticle')` when missing **or** when it is a draft and the caller may not see drafts. **Returning 404 rather than 403 for a hidden draft is deliberate** — a customer must not be able to probe for the existence of unpublished content.
- **`findArticleBySlug(slug, includeUnpublished)`** — same rule.
- **`createArticle(input, actorUserId)`** — generates the slug from `titleEn` when omitted: lowercase, non-alphanumerics collapsed to `-`, trimmed, truncated to 200. On a unique-constraint collision, append `-2`, `-3`, … and retry up to 5 times, then throw `ConflictError`.
- **`updateArticle(id, input)`** — **rejects any attempt to set `isPublished`** at the schema level, so it cannot reach here.
- **`setPublished(id, publish, actorUserId)`** — one transaction: load, set `isPublished`, and on publish also set `publishedAt` and `publishedByUserId`; on unpublish leave both. Then `recordAudit(manager, { action: publish ? KB_ARTICLE_PUBLISHED : KB_ARTICLE_UNPUBLISHED, entityType: KB_ARTICLE, entityId: id, summary: article.titleEn })`. Publishing an already-published article is a **no-op returning 200 with no audit row** — same rule Story 12 set for no-op transitions.
- **`softDeleteArticle(id)`** — `softDelete`, matching `softDeleteCustomer` (~lines 158–165).
- **`toPublicKbArticle` / `toSummary`** — the second truncates each body to `KB_EXCERPT_LENGTH` at a character boundary and appends `…` only when it actually cut.

### 4 — Schemas

**Create file: `backend-nodejs/src/modules/kb/kb.schemas.ts`**

```ts
export const listArticlesQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  includeUnpublished: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createArticleSchema = z.object({
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  categoryId: z.string().uuid().nullish(),
  titleEn: z.string().trim().min(1).max(300),
  titleAr: z.string().trim().min(1).max(300),
  bodyEn: z.string().trim().min(1).max(20000),
  bodyAr: z.string().trim().min(1).max(20000),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateArticleSchema = createArticleSchema
  .partial()
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
```

`updateArticleSchema` derives from `createArticleSchema`, which has **no `isPublished` key**, so a client cannot publish through `PATCH` even by accident. Zod strips unknown keys by default — verify that assumption with a test rather than trusting it.

Also add `kbIdParamSchema`, `kbSlugParamSchema`, `createCategorySchema`, `updateCategorySchema`.

### 5 — Controller

**Create file: `backend-nodejs/src/modules/kb/kb.controller.ts`**

One helper decides audience for the whole module:

```ts
/**
 * Only a caller holding kb.manage may see drafts. Every read path routes its
 * audience decision through this one function — the same shape tickets.controller
 * uses for `includeInternal` (~line 210).
 */
function canSeeDrafts(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.permissions.includes(PERMISSIONS.KB_MANAGE) ?? false;
}
```

Every list/get handler passes `includeUnpublished: canSeeDrafts(req) && req.query.includeUnpublished === true`. A caller **without** `kb.manage` who sends `includeUnpublished=true` is silently downgraded to published-only — **not** rejected, so the parameter is harmless to leave in a bookmarked URL.

Response envelope is the project standard: `{ success: true, data, correlationId: req.correlationId }`.

### 6 — Routes

**Create file: `backend-nodejs/src/modules/kb/kb.routes.ts`**

`router.use(authenticate)` first, as `tickets.routes.ts` does (~line 26).

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/categories` | `kb.read` | `includeInactive` honoured only with `kb.manage` |
| `POST` | `/categories` | `kb.manage` | |
| `PATCH` | `/categories/:id` | `kb.manage` | |
| `PATCH` | `/categories/:id/active` | `kb.manage` | |
| `GET` | `/articles` | `kb.read` | search + category filter + paging |
| `GET` | `/articles/slug/:slug` | `kb.read` | |
| `GET` | `/articles/:id` | `kb.read` | |
| `POST` | `/articles` | `kb.manage` | |
| `PATCH` | `/articles/:id` | `kb.manage` | |
| `POST` | `/articles/:id/publish` | `kb.manage` | |
| `POST` | `/articles/:id/unpublish` | `kb.manage` | |
| `DELETE` | `/articles/:id` | `kb.manage` | soft delete, 204 |

**Ordering matters.** `/articles/slug/:slug` must be registered **before** `/articles/:id`, or `slug` is captured as an id and fails uuid validation. This is the same hazard `tickets.routes.ts` handles by putting `/assignable-users` (~line 104) above `/:id` (~line 128).

**File: `backend-nodejs/src/routes/v1.ts`**

Add after the SLA mount:

```ts
v1.use('/kb', kbRoutes);
```

### 7 — Seed

**File: `backend-nodejs/src/database/seed.ts`**

- Seed `KB_CATEGORY_CATALOGUE` with the same `if (!existing)` loop as `TICKET_CATEGORY_CATALOGUE` (~lines 48–55).
- In the development-only block, create **six** demo articles: five published across the four categories, and **one left as a draft** — the draft is what proves the audience split works in a manual check.
- One demo article must have `categoryId: null`, proving an uncategorised FAQ is legal.
- Set `publishedByUserId` on the published ones to the admin user already resolved at ~line 244.

### 8 — Migration

**Create file: `backend-nodejs/src/database/migrations/1765000000000-KnowledgeBase.ts`**

`up()`:
- `CREATE TABLE [KbCategories]` — `id`, `code nvarchar(50) NOT NULL UNIQUE`, `nameEn`/`nameAr nvarchar(200) NOT NULL`, `sortOrder int NOT NULL DEFAULT 0`, `isActive bit NOT NULL CONSTRAINT [DF_KbCategories_isActive] DEFAULT 1`, plus the three `BaseEntity` timestamps. Index on `[code]`.
- `CREATE TABLE [KbArticles]` — `id`, `slug nvarchar(200) NOT NULL`, `categoryId uniqueidentifier NULL`, `titleEn`/`titleAr nvarchar(300) NOT NULL`, `bodyEn`/`bodyAr nvarchar(max) NOT NULL`, `isPublished bit NOT NULL CONSTRAINT [DF_KbArticles_isPublished] DEFAULT 0`, `publishedAt datetime2 NULL`, `publishedByUserId uniqueidentifier NULL`, `sortOrder int NOT NULL DEFAULT 0`, plus timestamps. FKs: `FK_KbArticles_categoryId → [KbCategories]([id])` and `FK_KbArticles_publishedByUserId → [Users]([id])`, both `ON DELETE NO ACTION`.
- `CREATE UNIQUE INDEX [UX_KbArticles_slug] ON [KbArticles]([slug])` — plain, not filtered; `slug` is not null.
- Indexes on `[categoryId]` and `[isPublished]`.

`down()`: `DROP TABLE [KbArticles]` then `DROP TABLE [KbCategories]` — **articles first**, or the FK blocks the drop.

---

## Edge Cases & Failure Modes

- **A customer requests `includeUnpublished=true`.** Silently downgraded to published-only by `canSeeDrafts` in `kb.controller.ts`. Not a 403 — the parameter is harmless in a shared or bookmarked URL, and rejecting it would leak that drafts exist.
- **A customer fetches a draft by id or slug.** `findArticleById` / `findArticleBySlug` throw `NotFoundError`, so the response is **404, not 403**. A 403 would confirm the article exists.
- **A search term containing `%`, `_`, or `[`.** Escaped by the `replace` copied from `tickets.service.ts` (~lines 183–189). Without it, `100%` matches every article — this is the single most likely omission in the story.
- **An empty or whitespace-only `q`.** `z.string().trim().min(1)` rejects it with 422 rather than running an unbounded scan. A caller wanting everything omits the parameter.
- **Arabic and mixed-direction search terms.** The `LIKE` runs against `nvarchar` columns, so Arabic matches work without special handling. Case and diacritic sensitivity follow the **database collation** and are deliberately not overridden — say so in the service comment so the behaviour reads as chosen.
- **A duplicate slug.** The unique index rejects it; `createArticle` retries with a numeric suffix up to 5 times, then throws `ConflictError` (409). Two simultaneous creations of the same title are the case that exercises the retry.
- **A title with no ASCII characters** (an Arabic-only `titleEn` is impossible per the schema, but a title of only punctuation is not). Slug generation can produce an empty string — fall back to a short random suffix rather than inserting an empty slug, which would collide on the second such article.
- **Publishing an already-published article.** No-op, 200, **no** audit row. Same rule as a no-op transition in Story 12; without it a double-click floods the log.
- **Unpublishing.** `publishedAt` and `publishedByUserId` are **kept**. They record when it was last live, which is information a re-publish would otherwise destroy.
- **Deactivating a category that has articles.** Allowed. The articles keep their `categoryId` and still appear in unfiltered lists; the category simply stops being offered as a filter. Categories are never hard-deleted, so no article is ever orphaned to a dangling FK.
- **An article whose category was soft-deleted.** Cannot happen — categories are deactivated, not deleted.
- **A 20 000-character body in a list response.** Prevented: list endpoints return `excerptEn` / `excerptAr` capped at `KB_EXCERPT_LENGTH`. Only the single-article endpoints return full bodies.
- **`isPublished` sent in a `PATCH` body.** Stripped by Zod before the handler sees it, because `createArticleSchema` has no such key. **Test this directly** — it is the guard that keeps publishing auditable.
- **A soft-deleted article.** Excluded from every read by TypeORM's `@DeleteDateColumn` handling, including from `findArticleBySlug`, so its slug remains taken. That is intentional: reusing a deleted article's slug would break any existing link.
- **`GET /articles/slug/:slug` registered after `/articles/:id`.** The slug is captured as `id`, fails uuid validation, and returns a confusing 422. Register the literal path first.

---

## Test Plan

1. **Unit — create `backend-nodejs/src/modules/kb/__tests__/kb.schemas.spec.ts`.**
   - `createArticleSchema` requires all four bilingual fields; omitting `titleAr` fails.
   - It rejects a slug containing uppercase, spaces, or `/`.
   - `updateArticleSchema` rejects an empty object and **strips** `isPublished` from a body that includes it.
   - `listArticlesQuerySchema` coerces `includeUnpublished=true` to boolean `true` and rejects an empty `q`.
2. **Unit — create `backend-nodejs/src/modules/kb/__tests__/kb.slug.spec.ts`.**
   - `"Getting Started With AZM"` → `getting-started-with-azm`.
   - Punctuation and repeated separators collapse to single hyphens with no leading or trailing hyphen.
   - A 400-character title truncates to 200.
   - A title of only punctuation produces a non-empty slug.
3. **Unit — create `backend-nodejs/src/modules/kb/__tests__/kb.excerpt.spec.ts`.**
   - A body shorter than `KB_EXCERPT_LENGTH` comes back unchanged, with **no** trailing ellipsis.
   - A longer body is cut to exactly `KB_EXCERPT_LENGTH` and gains one.
   - An Arabic body is cut without producing a broken surrogate.
4. **Integration — create `backend-nodejs/src/modules/kb/__tests__/kbArticles.itest.ts`.**
   - `POST /api/v1/kb/articles` as Administrator returns 201 with `isPublished: false`.
   - `GET /api/v1/kb/articles` as a **Customer** omits the draft; as Administrator with `includeUnpublished=true` it includes it.
   - A Customer sending `includeUnpublished=true` still gets published-only — **the audience test**.
   - `GET /api/v1/kb/articles/:id` for a draft as a Customer returns **404**, not 403.
   - `PATCH /api/v1/kb/articles/:id` with `{ "isPublished": true }` returns 200 and leaves the article a draft.
   - An Agent gets 403 on `POST`, `PATCH`, `DELETE`, and both publish routes, and 200 on every read.
   - `DELETE` returns 204 and the article disappears from every subsequent read, including by slug.
5. **Integration — create `backend-nodejs/src/modules/kb/__tests__/kbSearch.itest.ts`.**
   - `?q=` matching a title returns the article; matching only a body also returns it, **ordered after** the title match.
   - `?q=%` returns **no** rows rather than everything — the escaping test.
   - An Arabic term matches `titleAr` and `bodyAr`.
   - `?categoryId=` filters, and an article with a null category appears only when the filter is absent.
   - `?page=2&pageSize=2` returns a disjoint id set with a correct `total`.
   - A search that matches a draft returns it for a manager and not for a customer.
6. **Integration — create `backend-nodejs/src/modules/kb/__tests__/kbPublish.itest.ts`.**
   - `POST /:id/publish` sets `isPublished`, `publishedAt`, `publishedByUserId`, and writes exactly one `KB_ARTICLE_PUBLISHED` audit row.
   - Publishing again is a 200 no-op with **no** second audit row.
   - `POST /:id/unpublish` clears `isPublished`, **keeps** `publishedAt`, and writes one `KB_ARTICLE_UNPUBLISHED` row.
   - Publishing a soft-deleted article returns 404.
7. **Integration — create `backend-nodejs/src/modules/kb/__tests__/kbCategories.itest.ts`.**
   - Categories list ordered by `sortOrder`; an inactive category is hidden from a caller without `kb.manage`.
   - Deactivating a category with articles succeeds and those articles remain readable.
8. **Regression:** `npm run test:all`. This story adds a module and touches `v1.ts` and `seed.ts`; nothing else should move.

---

## Migration / Rollback

- Run `npm run migration:run` then `npm run db:seed`.
- Timestamp `1765000000000` follows Story 16's `1764000000000`. Story 20 takes `1766000000000`.
- `down()` drops both tables **and every article, permanently.** Article bodies exist nowhere else — export before reverting anywhere the content matters.
- Drop order in `down()` is `KbArticles` then `KbCategories`; reversing it fails on `FK_KbArticles_categoryId`.
- **Half-applied state:** `KbCategories` created but `KbArticles` not — the app starts, category endpoints work, article endpoints throw on a missing table. Revert fully and re-run.
- This story is independent of Stories 16 and 20; it can be reverted without touching them, provided Story 22's screens are not deployed against it.

---

## Verification Steps

1. **Backend typechecks:** `npm run typecheck` in `backend-nodejs/`.
2. **Migration applies:** `npm run migration:run` in `backend-nodejs/`.
3. **Seed runs:** `npm run db:seed` in `backend-nodejs/`. Then `SELECT COUNT(*) FROM KbArticles WHERE isPublished = 1` returns `5`, and `= 0` returns `1`.
4. **Unit tests:** `npm test` in `backend-nodejs/`.
5. **Integration tests:** `npm run test:integration` in `backend-nodejs/`.
6. **Backend runs:** `npm run dev` in `backend-nodejs/`, then:
   - As `admin@azm.local`: `GET /api/v1/kb/articles?includeUnpublished=true` → 6 items.
   - As `customer@azm.local`: the same URL → **5** items.
   - As `customer@azm.local`: `GET /api/v1/kb/articles/<draft id>` → 404.
   - As `admin@azm.local`: `GET /api/v1/kb/articles?q=%25` → 0 items.
   - As `admin@azm.local`: `POST /api/v1/kb/articles/<draft id>/publish` → 200, then `SELECT TOP 1 * FROM AuditLogs ORDER BY createdAt DESC` shows `KB_ARTICLE_PUBLISHED`.
   - As `agent@azm.local`: `POST /api/v1/kb/articles` → 403.
7. **Swagger:** `GET /api/docs` lists the KB tag with every route above.
8. **Regression:** `npm run test:all` in `backend-nodejs/`.

---

## Done Criteria

- [ ] `KbCategories` and `KbArticles` exist with the indexes and FKs specified.
- [ ] `isPublished` defaults to false — a new article is a draft.
- [ ] The published-only guard lives in `kb.service.ts`, not in a controller.
- [ ] A caller without `kb.manage` cannot see a draft through list, id, slug, or search.
- [ ] A hidden draft returns **404**, never 403.
- [ ] `includeUnpublished=true` from an unprivileged caller is silently downgraded, not rejected.
- [ ] `isPublished` cannot be set through `PATCH`.
- [ ] Publish stamps `publishedAt` and `publishedByUserId`; unpublish keeps both.
- [ ] Publish and unpublish each write exactly one audit row, and a no-op publish writes none.
- [ ] Search escapes `%`, `_`, and `[`, and `?q=%` returns nothing.
- [ ] Search covers all four bilingual columns and orders title matches first.
- [ ] Category filtering works, and an uncategorised article is reachable without the filter.
- [ ] List endpoints return excerpts; only single-article endpoints return full bodies.
- [ ] Slugs are unique, generated when omitted, and collision-retried.
- [ ] `/articles/slug/:slug` is registered before `/articles/:id`.
- [ ] Deleting is soft; a deleted article is gone from every read and its slug stays taken.
- [ ] The seed creates four categories, five published articles, one draft, and one uncategorised article.
- [ ] All new and existing backend tests pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 18.**
