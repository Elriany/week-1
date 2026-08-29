import type { RequestHandler } from 'express';
import { PERMISSIONS } from '../users/permissions.constants';
import * as kbService from './kb.service';

/**
 * Only a caller holding kb.manage may see drafts. Every read path routes its
 * audience decision through this one function — the same shape tickets.controller
 * uses for `includeInternal`.
 */
function canSeeDrafts(req: Parameters<RequestHandler>[0]): boolean {
  return req.auth?.permissions.includes(PERMISSIONS.KB_MANAGE) ?? false;
}

export const kbController = {
  listCategories: (async (req, res, next) => {
    try {
      const includeInactive = canSeeDrafts(req) && (req.query.includeInactive as boolean | undefined) === true;
      const result = await kbService.listCategories(includeInactive);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createCategory: (async (req, res, next) => {
    try {
      const result = await kbService.createCategory(req.body);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  updateCategory: (async (req, res, next) => {
    try {
      const result = await kbService.updateCategory(req.params.id, req.body);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  setCategoryActive: (async (req, res, next) => {
    try {
      const result = await kbService.setCategoryActive(req.params.id, req.body.isActive);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  listArticles: (async (req, res, next) => {
    try {
      const includeUnpublished = canSeeDrafts(req) && (req.query.includeUnpublished as boolean | undefined) === true;
      const result = await kbService.listArticles({
        q: req.query.q as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        includeUnpublished,
        page: req.query.page as number | undefined,
        pageSize: req.query.pageSize as number | undefined,
      });
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  getBySlug: (async (req, res, next) => {
    try {
      const includeUnpublished = canSeeDrafts(req);
      const article = await kbService.findArticleBySlug(req.params.slug, includeUnpublished);
      return res.json({ success: true, data: kbService.toPublicKbArticle(article), correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  getById: (async (req, res, next) => {
    try {
      const includeUnpublished = canSeeDrafts(req);
      const article = await kbService.findArticleById(req.params.id, includeUnpublished);
      return res.json({ success: true, data: kbService.toPublicKbArticle(article), correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createArticle: (async (req, res, next) => {
    try {
      const result = await kbService.createArticle(req.body, req.auth!.userId);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  updateArticle: (async (req, res, next) => {
    try {
      const result = await kbService.updateArticle(req.params.id, req.body);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  publish: (async (req, res, next) => {
    try {
      const result = await kbService.setPublished(req.params.id, true, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  unpublish: (async (req, res, next) => {
    try {
      const result = await kbService.setPublished(req.params.id, false, req.auth!.userId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  deleteArticle: (async (req, res, next) => {
    try {
      await kbService.softDeleteArticle(req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
