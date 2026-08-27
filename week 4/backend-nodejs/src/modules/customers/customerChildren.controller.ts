import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../common/errors/AppError';
import { ROLE_CODES } from '../users/permissions.constants';
import { findById } from './customers.service';
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

  listContacts: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await listContacts(req.params.id);
      return res.json({
        success: true,
        data: result,
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  createContact: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await createContact(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  updateContact: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await updateContact(req.params.childId, req.body);
      return res.json({
        success: true,
        data: result,
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  deleteContact: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      await deleteContact(req.params.childId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // Notes

  listNotes: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await listNotes(req.params.id);
      return res.json({
        success: true,
        data: result,
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  createNote: async (req, res, next) => {
    try {
      await requireCustomerInScope(req);
      const result = await createNote(req.params.id, req.auth!.userId, req.body.body);
      return res.status(201).json({
        success: true,
        data: result,
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  updateNote: async (req, res, next) => {
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
        correlationId: req.id,
      });
    } catch (err) {
      next(err);
    }
  },

  deleteNote: async (req, res, next) => {
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
  },
};
