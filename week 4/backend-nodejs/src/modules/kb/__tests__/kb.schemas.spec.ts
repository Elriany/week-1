import { describe, it, expect } from 'vitest';
import { createArticleSchema, updateArticleSchema, listArticlesQuerySchema } from '../kb.schemas';

const validBody = {
  titleEn: 'Title',
  titleAr: 'عنوان',
  bodyEn: 'Body',
  bodyAr: 'محتوى',
};

describe('createArticleSchema', () => {
  it('requires all four bilingual fields', () => {
    const { titleAr, ...rest } = validBody;
    expect(createArticleSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a slug with uppercase, spaces, or a slash', () => {
    expect(createArticleSchema.safeParse({ ...validBody, slug: 'Bad Slug' }).success).toBe(false);
    expect(createArticleSchema.safeParse({ ...validBody, slug: 'bad/slug' }).success).toBe(false);
    expect(createArticleSchema.safeParse({ ...validBody, slug: 'good-slug' }).success).toBe(true);
  });
});

describe('updateArticleSchema', () => {
  it('rejects an empty object', () => {
    expect(updateArticleSchema.safeParse({}).success).toBe(false);
  });

  it('strips isPublished from a body that includes it', () => {
    const result = updateArticleSchema.safeParse({ titleEn: 'New', isPublished: true } as any);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('isPublished');
    }
  });
});

describe('listArticlesQuerySchema', () => {
  it('coerces includeUnpublished=true to boolean true', () => {
    const result = listArticlesQuerySchema.safeParse({ includeUnpublished: 'true' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.includeUnpublished).toBe(true);
  });

  it('rejects an empty q', () => {
    expect(listArticlesQuerySchema.safeParse({ q: '' }).success).toBe(false);
  });
});
