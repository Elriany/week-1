import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { kbController } from './kb.controller';
import {
  listCategoriesQuerySchema,
  listArticlesQuerySchema,
  createArticleSchema,
  updateArticleSchema,
  kbIdParamSchema,
  kbSlugParamSchema,
  createCategorySchema,
  updateCategorySchema,
  setActiveSchema,
} from './kb.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/categories',
  authorize(PERMISSIONS.KB_READ),
  validate({ query: listCategoriesQuerySchema }),
  kbController.listCategories,
);
router.post(
  '/categories',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ body: createCategorySchema }),
  kbController.createCategory,
);
router.patch(
  '/categories/:id',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema, body: updateCategorySchema }),
  kbController.updateCategory,
);
router.patch(
  '/categories/:id/active',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema, body: setActiveSchema }),
  kbController.setCategoryActive,
);

router.get(
  '/articles',
  authorize(PERMISSIONS.KB_READ),
  validate({ query: listArticlesQuerySchema }),
  kbController.listArticles,
);

// Registered before /articles/:id — a literal path segment must not be
// swallowed by the uuid-validated param route.
router.get(
  '/articles/slug/:slug',
  authorize(PERMISSIONS.KB_READ),
  validate({ params: kbSlugParamSchema }),
  kbController.getBySlug,
);

router.get(
  '/articles/:id',
  authorize(PERMISSIONS.KB_READ),
  validate({ params: kbIdParamSchema }),
  kbController.getById,
);

router.post(
  '/articles',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ body: createArticleSchema }),
  kbController.createArticle,
);

router.patch(
  '/articles/:id',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema, body: updateArticleSchema }),
  kbController.updateArticle,
);

router.post(
  '/articles/:id/publish',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema }),
  kbController.publish,
);

router.post(
  '/articles/:id/unpublish',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema }),
  kbController.unpublish,
);

router.delete(
  '/articles/:id',
  authorize(PERMISSIONS.KB_MANAGE),
  validate({ params: kbIdParamSchema }),
  kbController.deleteArticle,
);

export default router;
