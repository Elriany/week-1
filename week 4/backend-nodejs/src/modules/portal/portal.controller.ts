import type { RequestHandler } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { NotFoundError } from '../../common/errors/AppError';
import { requirePortalCustomerId } from './portal.guard';
import * as portalService from './portal.service';
import { listAttachments, findAttachmentById, getAttachmentStoragePath } from '../tickets/ticketAttachments.service';
import { listNotes } from '../tickets/ticketNotes.service';
import { toPublicTicket } from '../tickets/tickets.service';
import { findPolicyByPriorityId } from '../sla/sla.service';
import { ownerDir } from '../../common/uploads/attachments.upload';
import { AppDataSource } from '../../config/data-source';
import { TicketCategory } from '../tickets/ticketCategory.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';

export const portalController = {
  getMyProfile: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const result = await portalService.getMyProfile(customerId);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  listMyTickets: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const result = await portalService.listMyTickets(customerId, {
        q: req.query.q as string | undefined,
        statusId: req.query.statusId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        slaStatus: req.query.slaStatus as any,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
        page: req.query.page as number | undefined,
        pageSize: req.query.pageSize as number | undefined,
      });
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createMyTicket: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const result = await portalService.createPortalTicket(customerId, req.auth!.userId, req.body);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  getMyTicket: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const ticket = await portalService.getMyTicket(customerId, req.params.id);
      const policy = await findPolicyByPriorityId(ticket.priorityId);
      return res.json({ success: true, data: toPublicTicket(ticket, policy), correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  listMyNotes: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      await portalService.getMyTicket(customerId, req.params.id);
      const result = await listNotes(req.params.id, false);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  createMyNote: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const result = await portalService.addMyNote(customerId, req.params.id, req.auth!.userId, req.body.body);
      return res.status(201).json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  listMyAttachments: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      await portalService.getMyTicket(customerId, req.params.id);
      const result = await listAttachments(req.params.id);
      return res.json({ success: true, data: result, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  downloadMyAttachment: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      // Ownership is checked BEFORE the file is ever touched — the single
      // highest-risk route in this module.
      const ticket = await portalService.getMyTicket(customerId, req.params.id);
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

  listMyHistory: (async (req, res, next) => {
    try {
      const customerId = requirePortalCustomerId(req);
      const page = Math.max(1, (req.query.page as number | undefined) ?? 1);
      const pageSize = Math.min(100, Math.max(1, (req.query.pageSize as number | undefined) ?? 20));
      const result = await portalService.listMyTicketChildren(customerId, req.params.id, page, pageSize);
      return res.json({ success: true, data: result.history, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  meta: (async (req, res, next) => {
    try {
      const [categories, priorities] = await Promise.all([
        AppDataSource.getRepository(TicketCategory).find({ order: { sortOrder: 'ASC' } }),
        AppDataSource.getRepository(TicketPriority).find({ order: { sortOrder: 'ASC' } }),
      ]);
      return res.json({ success: true, data: { categories, priorities }, correlationId: req.correlationId });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
