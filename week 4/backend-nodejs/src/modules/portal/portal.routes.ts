import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { portalController } from './portal.controller';
import {
  portalCreateTicketSchema,
  portalListTicketsQuerySchema,
  portalCreateNoteSchema,
  portalTicketIdParamSchema,
  portalChildIdParamSchema,
  portalListHistoryQuerySchema,
} from './portal.schemas';

const router = Router();

router.use(authenticate);

router.get('/me', authorize(PERMISSIONS.TICKETS_READ), portalController.getMyProfile);

router.get(
  '/meta',
  authorize(PERMISSIONS.TICKETS_READ),
  portalController.meta,
);

router.get(
  '/tickets',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ query: portalListTicketsQuerySchema }),
  portalController.listMyTickets,
);

router.post(
  '/tickets',
  authorize(PERMISSIONS.TICKETS_CREATE),
  validate({ body: portalCreateTicketSchema }),
  portalController.createMyTicket,
);

router.get(
  '/tickets/:id',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: portalTicketIdParamSchema }),
  portalController.getMyTicket,
);

router.get(
  '/tickets/:id/notes',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: portalTicketIdParamSchema }),
  portalController.listMyNotes,
);

router.post(
  '/tickets/:id/notes',
  authorize(PERMISSIONS.TICKETS_CREATE),
  validate({ params: portalTicketIdParamSchema, body: portalCreateNoteSchema }),
  portalController.createMyNote,
);

router.get(
  '/tickets/:id/attachments',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: portalTicketIdParamSchema }),
  portalController.listMyAttachments,
);

router.get(
  '/tickets/:id/attachments/:childId/download',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: portalChildIdParamSchema }),
  portalController.downloadMyAttachment,
);

router.get(
  '/tickets/:id/history',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: portalTicketIdParamSchema, query: portalListHistoryQuerySchema }),
  portalController.listMyHistory,
);

export default router;
