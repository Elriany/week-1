import type { RequestHandler } from 'express';
import { ForbiddenError, ValidationError, NotFoundError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import { ownerDir } from '../../common/uploads/attachments.upload';
import { findById } from './tickets.service';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  findNoteById,
} from './ticketNotes.service';
import {
  listAttachments,
  createAttachment,
  findAttachmentById,
  softDeleteAttachment,
  getAttachmentStoragePath,
  toPublicAttachment,
} from './ticketAttachments.service';
import { Ticket } from './ticket.entity';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Loads the parent ticket and rejects when it belongs to another branch.
 * Child records inherit the parent's scope — holding `tickets.update` is not
 * sufficient if the ticket itself is out of reach.
 */
export async function requireTicketInScope(req: Parameters<RequestHandler>[0]): Promise<Ticket> {
  const ticket = await findById(req.params.id);
  if (req.auth?.roleCode !== ROLE_CODES.ADMIN && ticket.branchId !== req.auth!.branchId) {
    throw new ForbiddenError('This ticket belongs to another branch');
  }
  return ticket;
}

export const ticketChildrenController = {
  // Notes

  listNotes: (async (req, res, next) => {
    try {
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const includeInternal = req.auth!.roleCode !== ROLE_CODES.CUSTOMER;
      const result = await listNotes(req.params.id, includeInternal);
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
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const result = await createNote(req.params.id, req.auth!.userId, req.body.body, req.body.isInternal);
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
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const note = await findNoteById(req.params.childId);

      if (note.ticketId !== req.params.id) {
        throw new ForbiddenError('This note belongs to another ticket');
      }

      if (note.authorUserId !== req.auth!.userId) {
        throw new ForbiddenError('You can only edit your own notes');
      }

      const result = await updateNote(req.params.childId, req.body.body, req.body.isInternal);
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
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const note = await findNoteById(req.params.childId);

      if (note.ticketId !== req.params.id) {
        throw new ForbiddenError('This note belongs to another ticket');
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
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const result = await listAttachments(req.params.id);
      return res.json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  uploadAttachment: (async (req, res, next) => {
    try {
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      if (!req.file) {
        throw new ValidationError({ file: 'No file uploaded' });
      }
      const result = await createAttachment(req.params.id, req.auth!.userId, req.file);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  downloadAttachment: (async (req, res, next) => {
    try {
      const ticket = await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const attachment = await findAttachmentById(req.params.childId);

      if (attachment.ticketId !== ticket.id) {
        throw new NotFoundError('Attachment');
      }

      const filePath = await getAttachmentStoragePath(ticket.id, attachment);
      const ownerPath = ownerDir('tickets', ticket.id);

      if (!filePath.startsWith(ownerPath + path.sep)) {
        throw new NotFoundError('Attachment');
      }

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Attachment');
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.download(filePath, attachment.originalName);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  deleteAttachment: (async (req, res, next) => {
    try {
      await requireTicketInScope(req as Parameters<RequestHandler>[0]);
      const attachment = await findAttachmentById(req.params.childId);

      if (attachment.ticketId !== req.params.id) {
        throw new NotFoundError('Attachment');
      }

      await softDeleteAttachment(req.params.childId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
