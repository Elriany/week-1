import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { ticketsController } from './tickets.controller';
import { ticketChildrenController } from './ticketChildren.controller';
import { handleTicketUpload } from '../../common/uploads/attachments.upload';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketIdParamSchema,
  listTicketsQuerySchema,
  transitionTicketSchema,
  assignTicketSchema,
  listHistoryQuerySchema,
} from './tickets.schemas';
import {
  createTicketNoteSchema,
  updateTicketNoteSchema,
  ticketChildParamSchema,
} from './ticketChildren.schemas';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/tickets/meta:
 *   get:
 *     tags: [Tickets]
 *     operationId: getTicketMeta
 *     summary: Get ticket reference data
 *     responses:
 *       200:
 *         description: Reference data for tickets (statuses, priorities, categories)
 */
router.get('/meta', authorize(PERMISSIONS.TICKETS_READ), ticketsController.meta);

/**
 * @openapi
 * /api/v1/tickets:
 *   get:
 *     tags: [Tickets]
 *     operationId: listTickets
 *     summary: List tickets
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: statusId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: priorityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assignedUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: unassigned
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: ['createdAt', 'updatedAt', 'ticketNumber', 'priority'] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: ['asc', 'desc'] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Tickets listed successfully
 */
router.get(
  '/',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ query: listTicketsQuerySchema }),
  ticketsController.list,
);

/**
 * @openapi
 * /api/v1/tickets/assignable-users:
 *   get:
 *     tags: [Tickets]
 *     operationId: getAssignableUsers
 *     summary: Get list of users that can be assigned to tickets
 *     responses:
 *       200:
 *         description: List of assignable users
 */
router.get(
  '/assignable-users',
  authorize(PERMISSIONS.TICKETS_READ),
  ticketsController.assignableUsers,
);

/**
 * @openapi
 * /api/v1/tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     operationId: getTicket
 *     summary: Get ticket by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/:id',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: ticketIdParamSchema }),
  ticketsController.getOne,
);

/**
 * @openapi
 * /api/v1/tickets:
 *   post:
 *     tags: [Tickets]
 *     operationId: createTicket
 *     summary: Create a new ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {}
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post(
  '/',
  authorize(PERMISSIONS.TICKETS_CREATE),
  validate({ body: createTicketSchema }),
  ticketsController.create,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/status:
 *   patch:
 *     tags: [Tickets]
 *     operationId: transitionTicket
 *     summary: Transition a ticket to a new status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {}
 *     responses:
 *       200:
 *         description: Ticket status transitioned successfully
 */
router.patch(
  '/:id/status',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketIdParamSchema, body: transitionTicketSchema }),
  ticketsController.transition,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/assignee:
 *   patch:
 *     tags: [Tickets]
 *     operationId: assignTicket
 *     summary: Assign or unassign a ticket to/from a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {}
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.patch(
  '/:id/assignee',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketIdParamSchema, body: assignTicketSchema }),
  ticketsController.assign,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/history:
 *   get:
 *     tags: [Tickets]
 *     operationId: getTicketHistory
 *     summary: Get audit history for a ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Ticket history retrieved successfully
 */
router.get(
  '/:id/history',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: ticketIdParamSchema, query: listHistoryQuerySchema }),
  ticketsController.history,
);

/**
 * @openapi
 * /api/v1/tickets/{id}:
 *   patch:
 *     tags: [Tickets]
 *     operationId: updateTicket
 *     summary: Update a ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {}
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 */
router.patch(
  '/:id',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  ticketsController.update,
);

// Notes

/**
 * @openapi
 * /api/v1/tickets/{id}/notes:
 *   get:
 *     tags: [Tickets]
 *     operationId: listTicketNotes
 *     summary: List ticket notes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notes listed successfully
 */
router.get('/:id/notes', authorize(PERMISSIONS.TICKETS_READ), validate({ params: ticketIdParamSchema }), ticketChildrenController.listNotes);

/**
 * @openapi
 * /api/v1/tickets/{id}/notes:
 *   post:
 *     tags: [Tickets]
 *     operationId: createTicketNote
 *     summary: Create a ticket note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string, maxLength: 4000 }
 *               isInternal: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Note created successfully
 */
router.post(
  '/:id/notes',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketIdParamSchema, body: createTicketNoteSchema }),
  ticketChildrenController.createNote,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/notes/{childId}:
 *   patch:
 *     tags: [Tickets]
 *     operationId: updateTicketNote
 *     summary: Update a ticket note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body: { type: string, maxLength: 4000 }
 *               isInternal: { type: boolean }
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
router.patch(
  '/:id/notes/:childId',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketChildParamSchema, body: updateTicketNoteSchema }),
  ticketChildrenController.updateNote,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/notes/{childId}:
 *   delete:
 *     tags: [Tickets]
 *     operationId: deleteTicketNote
 *     summary: Delete a ticket note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Note deleted successfully
 */
router.delete(
  '/:id/notes/:childId',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketChildParamSchema }),
  ticketChildrenController.deleteNote,
);

// Attachments

/**
 * @openapi
 * /api/v1/tickets/{id}/attachments:
 *   get:
 *     tags: [Tickets]
 *     operationId: listTicketAttachments
 *     summary: List ticket attachments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attachments listed successfully
 */
router.get('/:id/attachments', authorize(PERMISSIONS.TICKETS_READ), validate({ params: ticketIdParamSchema }), ticketChildrenController.listAttachments);

/**
 * @openapi
 * /api/v1/tickets/{id}/attachments:
 *   post:
 *     tags: [Tickets]
 *     operationId: uploadTicketAttachment
 *     summary: Upload a ticket attachment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment uploaded successfully
 */
router.post(
  '/:id/attachments',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketIdParamSchema }),
  handleTicketUpload,
  ticketChildrenController.uploadAttachment,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/attachments/{childId}/download:
 *   get:
 *     tags: [Tickets]
 *     operationId: downloadTicketAttachment
 *     summary: Download a ticket attachment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attachment file
 */
router.get(
  '/:id/attachments/:childId/download',
  authorize(PERMISSIONS.TICKETS_READ),
  validate({ params: ticketChildParamSchema }),
  ticketChildrenController.downloadAttachment,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/attachments/{childId}:
 *   delete:
 *     tags: [Tickets]
 *     operationId: deleteTicketAttachment
 *     summary: Delete a ticket attachment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Attachment deleted successfully
 */
router.delete(
  '/:id/attachments/:childId',
  authorize(PERMISSIONS.TICKETS_UPDATE),
  validate({ params: ticketChildParamSchema }),
  ticketChildrenController.deleteAttachment,
);

export default router;
