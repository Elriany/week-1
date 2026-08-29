import path from 'node:path';
import fs from 'node:fs';
import type { RequestHandler } from 'express';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { ownerDir } from '../../common/uploads/attachments.upload';
import { ROLE_CODES } from '../users/permissions.constants';
import { findById } from './customers.service';
import {
  listAttachments,
  createAttachment,
  findAttachmentById,
  softDeleteAttachment,
} from './customerAttachments.service';
import { getHistory } from './customerHistory.service';
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  type CreateContactInput,
  type UpdateContactInput,
} from './customerContacts.service';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  findNoteById,
} from './customerNotes.service';
import { Customer } from './customer.entity';

/**
 * Loads the parent customer and rejects when it belongs to another branch.
 * Child records inherit the parent's scope — holding `customers.update` is not
 * sufficient if the customer itself is out of reach.
 */
export async function requireCustomerInScope(req: Parameters<RequestHandler>[0]): Promise<Customer> {
  const customer = await findById(req.params.id);
  if (req.auth?.roleCode !== ROLE_CODES.ADMIN && customer.branchId !== req.auth!.branchId) {
    throw new ForbiddenError('This customer belongs to another branch');
  }
  return customer;
}

export const customerChildrenController = {
  // Contacts

  listContacts: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await listContacts(req.params.id);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createContact: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await createContact(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  updateContact: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await updateContact(req.params.childId, req.body);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  deleteContact: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      await deleteContact(req.params.childId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  // Notes

  listNotes: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await listNotes(req.params.id);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createNote: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await createNote(req.params.id, req.auth!.userId, req.body.body);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  updateNote: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const note = await findNoteById(req.params.childId);

      if (note.customerId !== req.params.id) {
        throw new ForbiddenError('This note belongs to another customer');
      }

      if (note.authorUserId !== req.auth!.userId) {
        throw new ForbiddenError('You can only edit your own notes');
      }

      const result = await updateNote(req.params.childId, req.body.body);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  deleteNote: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const note = await findNoteById(req.params.childId);

      if (note.customerId !== req.params.id) {
        throw new ForbiddenError('This note belongs to another customer');
      }

      const isAdmin = req.auth?.roleCode === ROLE_CODES.ADMIN;
      if (note.authorUserId !== req.auth!.userId && !isAdmin) {
        throw new ForbiddenError('You can only delete your own notes');
      }

      await deleteNote(req.params.childId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  // Attachments

  listAttachments: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await listAttachments(req.params.id);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createAttachment: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      // 422, not 404: a missing part is a malformed request, and a 404 here
      // reads to the caller as "customer not found".
      if (!req.file) throw new ValidationError({ file: 'A file is required' });
      const result = await createAttachment(req.params.id, req.auth!.userId, req.file);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  downloadAttachment: (async (req, res, next) => {
    try {
      const customer = await requireCustomerInScope(req);
      const attachment = await findAttachmentById(req.params.childId);

      if (attachment.customerId !== customer.id) throw new NotFoundError('Attachment');

      const dir = ownerDir('customers', customer.id);
      const filePath = path.resolve(dir, attachment.storedName);
      if (!filePath.startsWith(dir + path.sep)) {
        throw new NotFoundError('Attachment');
      }
      if (!fs.existsSync(filePath)) throw new NotFoundError('Attachment');

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', attachment.mimeType);
      return res.download(filePath, attachment.originalName);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  deleteAttachment: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      await softDeleteAttachment(req.params.childId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  // History

  getHistory: (async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const page = (req.query.page as number | undefined) ?? 1;
      const pageSize = (req.query.pageSize as number | undefined) ?? 20;
      const result = await getHistory(req.params.id, page, pageSize);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
