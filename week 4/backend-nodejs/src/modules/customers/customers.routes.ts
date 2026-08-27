import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { PERMISSIONS } from '../users/permissions.constants';
import { customersController } from './customers.controller';
import { customerChildrenController } from './customerChildren.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  setCustomerActiveSchema,
} from './customers.schemas';
import {
  createContactSchema,
  updateContactSchema,
  noteBodySchema,
  customerChildParamSchema,
} from './customerChildren.schemas';
import { handleCustomerUpload, ownerDir, UPLOAD_ROOT } from '../../common/uploads/attachments.upload';
import {
  listAttachments,
  createAttachment,
  findAttachmentById,
  softDeleteAttachment,
  toPublicAttachment,
} from './customerAttachments.service';
import { getHistory } from './customerHistory.service';
import path from 'node:path';
import fs from 'node:fs';
import { ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/customers:
 *   get:
 *     tags: [Customers]
 *     operationId: listCustomers
 *     summary: List customers
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Customers listed successfully
 */
router.get('/', authorize(PERMISSIONS.CUSTOMERS_READ), validate({ query: listCustomersQuerySchema }), customersController.list);

/**
 * @openapi
 * /api/v1/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     operationId: getCustomer
 *     summary: Get customer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 */
router.get('/:id', authorize(PERMISSIONS.CUSTOMERS_READ), validate({ params: customerIdParamSchema }), customersController.getOne);

/**
 * @openapi
 * /api/v1/customers:
 *   post:
 *     tags: [Customers]
 *     operationId: createCustomer
 *     summary: Create a customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullNameEn, fullNameAr, branchId]
 *             properties:
 *               code: { type: string }
 *               fullNameEn: { type: string }
 *               fullNameAr: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               preferredLanguage: { type: string, enum: ['en', 'ar'] }
 *               branchId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       409:
 *         description: Customer code already exists
 */
router.post('/', authorize(PERMISSIONS.CUSTOMERS_CREATE), validate({ body: createCustomerSchema }), customersController.create);

/**
 * @openapi
 * /api/v1/customers/{id}:
 *   patch:
 *     tags: [Customers]
 *     operationId: updateCustomer
 *     summary: Update a customer
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
 *             properties:
 *               fullNameEn: { type: string }
 *               fullNameAr: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               preferredLanguage: { type: string, enum: ['en', 'ar'] }
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.patch(
  '/:id',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  customersController.update,
);

/**
 * @openapi
 * /api/v1/customers/{id}/active:
 *   patch:
 *     tags: [Customers]
 *     operationId: setCustomerActive
 *     summary: Activate or deactivate a customer
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
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Customer active status updated successfully
 *       404:
 *         description: Customer not found
 */
router.patch(
  '/:id/active',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: setCustomerActiveSchema }),
  customersController.setActive,
);

/**
 * @openapi
 * /api/v1/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     operationId: deleteCustomer
 *     summary: Delete a customer (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 */
router.delete('/:id', authorize(PERMISSIONS.CUSTOMERS_DELETE), validate({ params: customerIdParamSchema }), customersController.remove);

// Contacts

/**
 * @openapi
 * /api/v1/customers/{id}/contacts:
 *   get:
 *     tags: [Customers]
 *     operationId: listContacts
 *     summary: List customer contacts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Contacts listed successfully
 *       403:
 *         description: Not authorized to view this customer
 *       404:
 *         description: Customer not found
 */
router.get('/:id/contacts', authorize(PERMISSIONS.CUSTOMERS_READ), validate({ params: customerIdParamSchema }), customerChildrenController.listContacts);

/**
 * @openapi
 * /api/v1/customers/{id}/contacts:
 *   post:
 *     tags: [Customers]
 *     operationId: createContact
 *     summary: Create a customer contact
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
 *             required: [fullNameEn, fullNameAr]
 *             properties:
 *               fullNameEn: { type: string }
 *               fullNameAr: { type: string }
 *               jobTitle: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               isPrimary: { type: boolean }
 *     responses:
 *       201:
 *         description: Contact created successfully
 */
router.post(
  '/:id/contacts',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: createContactSchema }),
  customerChildrenController.createContact,
);

/**
 * @openapi
 * /api/v1/customers/{id}/contacts/{childId}:
 *   patch:
 *     tags: [Customers]
 *     operationId: updateContact
 *     summary: Update a customer contact
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
 *               fullNameEn: { type: string }
 *               fullNameAr: { type: string }
 *               jobTitle: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               isPrimary: { type: boolean }
 *     responses:
 *       200:
 *         description: Contact updated successfully
 */
router.patch(
  '/:id/contacts/:childId',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerChildParamSchema, body: updateContactSchema }),
  customerChildrenController.updateContact,
);

/**
 * @openapi
 * /api/v1/customers/{id}/contacts/{childId}:
 *   delete:
 *     tags: [Customers]
 *     operationId: deleteContact
 *     summary: Delete a customer contact
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
 *         description: Contact deleted successfully
 */
router.delete(
  '/:id/contacts/:childId',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerChildParamSchema }),
  customerChildrenController.deleteContact,
);

// Notes

/**
 * @openapi
 * /api/v1/customers/{id}/notes:
 *   get:
 *     tags: [Customers]
 *     operationId: listNotes
 *     summary: List customer notes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notes listed successfully
 *       403:
 *         description: Not authorized to view this customer
 *       404:
 *         description: Customer not found
 */
router.get('/:id/notes', authorize(PERMISSIONS.CUSTOMERS_READ), validate({ params: customerIdParamSchema }), customerChildrenController.listNotes);

/**
 * @openapi
 * /api/v1/customers/{id}/notes:
 *   post:
 *     tags: [Customers]
 *     operationId: createNote
 *     summary: Create a customer note
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
 *     responses:
 *       201:
 *         description: Note created successfully
 */
router.post(
  '/:id/notes',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: noteBodySchema }),
  customerChildrenController.createNote,
);

/**
 * @openapi
 * /api/v1/customers/{id}/notes/{childId}:
 *   patch:
 *     tags: [Customers]
 *     operationId: updateNote
 *     summary: Update a customer note
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
 *             required: [body]
 *             properties:
 *               body: { type: string, maxLength: 4000 }
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
router.patch(
  '/:id/notes/:childId',
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerChildParamSchema, body: noteBodySchema }),
  customerChildrenController.updateNote,
);

/**
 * @openapi
 * /api/v1/customers/{id}/notes/{childId}:
 *   delete:
 *     tags: [Customers]
 *     operationId: deleteNote
 *     summary: Delete a customer note
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
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerChildParamSchema }),
  customerChildrenController.deleteNote,
);

// Attachments

/**
 * @openapi
 * /api/v1/customers/{id}/attachments:
 *   get:
 *     tags: [Customers]
 *     operationId: listAttachments
 *     summary: List customer attachments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attachments listed successfully
 */
router.get(
  '/:id/attachments',
  authorize(PERMISSIONS.CUSTOMERS_READ),
  validate({ params: customerIdParamSchema }),
  async (req, res, next) => {
    try {
      const { requireCustomerInScope } = await import('./customerChildren.controller');
      await requireCustomerInScope(req);
      const result = await listAttachments(req.params.id);
      res.json({ success: true, data: result, correlationId: req.id });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/v1/customers/{id}/attachments:
 *   post:
 *     tags: [Customers]
 *     operationId: uploadAttachment
 *     summary: Upload a customer attachment
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
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema }),
  handleCustomerUpload,
  async (req, res, next) => {
    try {
      const { requireCustomerInScope } = await import('./customerChildren.controller');
      await requireCustomerInScope(req);
      if (!req.file) throw new NotFoundError('No file uploaded');
      const result = await createAttachment(req.params.id, req.auth!.userId, req.file);
      res.status(201).json({ success: true, data: result, correlationId: req.id });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/v1/customers/{id}/attachments/{childId}/download:
 *   get:
 *     tags: [Customers]
 *     operationId: downloadAttachment
 *     summary: Download a customer attachment
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
  authorize(PERMISSIONS.CUSTOMERS_READ),
  validate({ params: customerChildParamSchema }),
  async (req, res, next) => {
    try {
      const { requireCustomerInScope } = await import('./customerChildren.controller');
      const customer = await requireCustomerInScope(req);
      const attachment = await findAttachmentById(req.params.childId);

      if (attachment.customerId !== customer.id) throw new NotFoundError('Attachment');

      const filePath = path.resolve(ownerDir('customers', customer.id), attachment.storedName);
      if (!filePath.startsWith(ownerDir('customers', customer.id) + path.sep)) {
        throw new NotFoundError('Attachment');
      }
      if (!fs.existsSync(filePath)) throw new NotFoundError('Attachment');

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', attachment.mimeType);
      res.download(filePath, attachment.originalName);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/v1/customers/{id}/attachments/{childId}:
 *   delete:
 *     tags: [Customers]
 *     operationId: deleteAttachment
 *     summary: Delete a customer attachment
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
  authorize(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerChildParamSchema }),
  async (req, res, next) => {
    try {
      const { requireCustomerInScope } = await import('./customerChildren.controller');
      await requireCustomerInScope(req);
      await softDeleteAttachment(req.params.childId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// History

/**
 * @openapi
 * /api/v1/customers/{id}/history:
 *   get:
 *     tags: [Customers]
 *     operationId: getCustomerHistory
 *     summary: Get customer interaction history
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
 *         description: History retrieved successfully
 */
router.get(
  '/:id/history',
  authorize(PERMISSIONS.CUSTOMERS_READ),
  validate({ params: customerIdParamSchema }),
  async (req, res, next) => {
    try {
      const { requireCustomerInScope } = await import('./customerChildren.controller');
      await requireCustomerInScope(req);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await getHistory(req.params.id, page, pageSize);
      res.json({ success: true, data: result, correlationId: req.id });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
