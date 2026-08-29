import { z } from 'zod';

export const listCategoriesQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

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

export const kbIdParamSchema = z.object({ id: z.string().uuid() });
export const kbSlugParamSchema = z.object({ slug: z.string().trim().min(1) });

export const createCategorySchema = z.object({
  code: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateCategorySchema = z
  .object({
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().min(1).max(200).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const setActiveSchema = z.object({ isActive: z.boolean() });
