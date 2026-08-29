import { AppDataSource } from '../../config/data-source';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { KbCategory } from './kbCategory.entity';
import { KbArticle } from './kbArticle.entity';
import { KB_EXCERPT_LENGTH } from './kb.constants';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';

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

export interface CreateArticleInput {
  slug?: string;
  categoryId?: string | null;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  sortOrder?: number;
}

export interface UpdateArticleInput {
  slug?: string;
  categoryId?: string | null;
  titleEn?: string;
  titleAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  sortOrder?: number;
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  return base || `article-${Math.random().toString(36).slice(2, 8)}`;
}

export function excerpt(body: string): string {
  if (body.length <= KB_EXCERPT_LENGTH) return body;
  return body.slice(0, KB_EXCERPT_LENGTH) + '…';
}

function toCategorySummary(c?: KbCategory | null) {
  return c ? { id: c.id, code: c.code, nameEn: c.nameEn, nameAr: c.nameAr } : null;
}

export function toPublicKbArticle(a: KbArticle): PublicKbArticle {
  return {
    id: a.id,
    slug: a.slug,
    categoryId: a.categoryId ?? null,
    category: toCategorySummary(a.category),
    titleEn: a.titleEn,
    titleAr: a.titleAr,
    bodyEn: a.bodyEn,
    bodyAr: a.bodyAr,
    isPublished: a.isPublished,
    publishedAt: a.publishedAt ?? null,
    sortOrder: a.sortOrder,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function toSummary(a: KbArticle): PublicKbArticleSummary {
  const full = toPublicKbArticle(a);
  const { bodyEn, bodyAr, ...rest } = full;
  return { ...rest, excerptEn: excerpt(bodyEn), excerptAr: excerpt(bodyAr) };
}

const categories = () => AppDataSource.getRepository(KbCategory);
const articles = () => AppDataSource.getRepository(KbArticle);

export async function listCategories(includeInactive: boolean): Promise<KbCategory[]> {
  const qb = categories().createQueryBuilder('c').orderBy('c.sortOrder', 'ASC').addOrderBy('c.code', 'ASC');
  if (!includeInactive) qb.where('c.isActive = :active', { active: true });
  return qb.getMany();
}

export async function createCategory(input: { code: string; nameEn: string; nameAr: string; sortOrder?: number }): Promise<KbCategory> {
  const clash = await categories().findOne({ where: { code: input.code } });
  if (clash) throw new ConflictError('A category with this code already exists');
  return categories().save(categories().create({ ...input, isActive: true }));
}

export async function updateCategory(id: string, input: { nameEn?: string; nameAr?: string; sortOrder?: number }): Promise<KbCategory> {
  const category = await categories().findOne({ where: { id } });
  if (!category) throw new NotFoundError('KbCategory');
  Object.assign(category, input);
  return categories().save(category);
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<KbCategory> {
  const category = await categories().findOne({ where: { id } });
  if (!category) throw new NotFoundError('KbCategory');
  category.isActive = isActive;
  return categories().save(category);
}

export async function listArticles(filter: ListArticlesFilter = {}): Promise<{
  items: PublicKbArticleSummary[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const qb = articles().createQueryBuilder('a').leftJoinAndSelect('a.category', 'category', 'category.id = a.categoryId');

  // This line is the entire audience guard; it belongs here so no controller can forget it.
  if (!filter.includeUnpublished) {
    qb.andWhere('a.isPublished = :p', { p: true });
  }

  if (filter.categoryId) qb.andWhere('a.categoryId = :categoryId', { categoryId: filter.categoryId });

  let term: string | undefined;
  if (filter.q) {
    term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
    qb.andWhere(
      '(a.titleEn LIKE :term OR a.titleAr LIKE :term OR a.bodyEn LIKE :term OR a.bodyAr LIKE :term)',
      { term },
    );
  }

  if (term) {
    qb.addSelect('CASE WHEN a.titleEn LIKE :term OR a.titleAr LIKE :term THEN 0 ELSE 1 END', 'title_rank');
    qb.orderBy('title_rank', 'ASC');
  }
  qb.addOrderBy('a.sortOrder', 'ASC').addOrderBy('a.updatedAt', 'DESC').addOrderBy('a.id', 'ASC');

  qb.skip((page - 1) * pageSize).take(pageSize);

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(toSummary), total, page, pageSize };
}

/**
 * Returning 404 rather than 403 for a hidden draft is deliberate — a customer
 * must not be able to probe for the existence of unpublished content.
 */
export async function findArticleById(id: string, includeUnpublished: boolean): Promise<KbArticle> {
  const article = await articles()
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.category', 'category', 'category.id = a.categoryId')
    .where('a.id = :id', { id })
    .getOne();
  if (!article || (!article.isPublished && !includeUnpublished)) throw new NotFoundError('KbArticle');
  return article;
}

export async function findArticleBySlug(slug: string, includeUnpublished: boolean): Promise<KbArticle> {
  const article = await articles()
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.category', 'category', 'category.id = a.categoryId')
    .where('a.slug = :slug', { slug })
    .getOne();
  if (!article || (!article.isPublished && !includeUnpublished)) throw new NotFoundError('KbArticle');
  return article;
}

export async function createArticle(input: CreateArticleInput, actorUserId: string): Promise<PublicKbArticle> {
  const baseSlug = input.slug?.trim() || slugify(input.titleEn);

  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const clash = await articles().findOne({ where: { slug }, withDeleted: true });
    if (!clash) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt + 1}`;
  }
  if (attempt >= 5) {
    const stillClashing = await articles().findOne({ where: { slug }, withDeleted: true });
    if (stillClashing) throw new ConflictError('Could not generate a unique slug');
  }

  const saved = await articles().save(
    articles().create({
      slug,
      categoryId: input.categoryId ?? null,
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      bodyEn: input.bodyEn,
      bodyAr: input.bodyAr,
      sortOrder: input.sortOrder ?? 0,
      isPublished: false,
    }),
  );

  return toPublicKbArticle(await findArticleById(saved.id, true));
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<PublicKbArticle> {
  const article = await findArticleById(id, true);
  Object.assign(article, input);
  await articles().save(article);
  return toPublicKbArticle(await findArticleById(id, true));
}

/**
 * Publishing an already-published article is a no-op returning 200 with no
 * audit row — same rule Story 12 set for no-op transitions.
 */
export async function setPublished(id: string, publish: boolean, actorUserId: string): Promise<PublicKbArticle> {
  const article = await findArticleById(id, true);

  if (article.isPublished === publish) {
    return toPublicKbArticle(article);
  }

  await AppDataSource.transaction(async manager => {
    article.isPublished = publish;
    if (publish) {
      article.publishedAt = new Date();
      article.publishedByUserId = actorUserId;
    }
    // Unpublishing keeps publishedAt/publishedByUserId — they record when it
    // was last live, which a re-publish would otherwise destroy.

    await manager.save(KbArticle, article);

    await recordAudit(manager, {
      actorUserId,
      action: publish ? AUDIT_ACTIONS.KB_ARTICLE_PUBLISHED : AUDIT_ACTIONS.KB_ARTICLE_UNPUBLISHED,
      entityType: AUDIT_ENTITY_TYPES.KB_ARTICLE,
      entityId: id,
      summary: article.titleEn,
    });
  });

  // findArticleById opens its own connection, separate from the transaction's
  // — it must run after the transaction commits, or it deadlocks against the
  // still-uncommitted update (see Story 15's note on the same pattern).
  return toPublicKbArticle(await findArticleById(id, true));
}

export async function softDeleteArticle(id: string): Promise<void> {
  await findArticleById(id, true);
  await articles().softDelete(id);
}
