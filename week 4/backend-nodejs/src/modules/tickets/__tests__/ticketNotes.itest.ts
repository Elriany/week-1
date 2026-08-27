import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppDataSource } from '../../../config/data-source';
import { Ticket } from '../ticket.entity';
import { TicketComment } from '../ticketComment.entity';
import { User } from '../../users/user.entity';
import { Branch } from '../../branches/branch.entity';
import { Role } from '../../users/role.entity';
import { ROLE_CODES } from '../../users/permissions.constants';
import { hashPassword } from '../../users/users.service';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  findNoteById,
  toPublicTicketNote,
} from '../ticketNotes.service';
import { createTicket } from '../tickets.service';

describe('Ticket Notes Service (Integration)', () => {
  let branch: Branch;
  let admin: User;
  let customer: User;
  let ticket: Ticket;
  let noteId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Create test branch
    branch = AppDataSource.getRepository(Branch).create({
      code: 'TEST_NOTES',
      nameEn: 'Test Branch for Notes',
      nameAr: 'فرع اختبار الملاحظات',
      isActive: true,
    });
    branch = await AppDataSource.getRepository(Branch).save(branch);

    // Create roles
    const adminRole = await AppDataSource.getRepository(Role).findOne({ where: { code: ROLE_CODES.ADMIN } });
    const customerRole = await AppDataSource.getRepository(Role).findOne({ where: { code: ROLE_CODES.CUSTOMER } });

    // Create admin user
    admin = AppDataSource.getRepository(User).create({
      email: `admin-notes-${Date.now()}@test.local`,
      passwordHash: await hashPassword('Test@1234'),
      fullNameEn: 'Admin User',
      fullNameAr: 'مستخدم إداري',
      roleId: adminRole!.id,
      branchId: branch.id,
      isActive: true,
    });
    admin = await AppDataSource.getRepository(User).save(admin);

    // Create customer user
    customer = AppDataSource.getRepository(User).create({
      email: `customer-notes-${Date.now()}@test.local`,
      passwordHash: await hashPassword('Test@1234'),
      fullNameEn: 'Customer User',
      fullNameAr: 'عميل المستخدم',
      roleId: customerRole!.id,
      branchId: branch.id,
      isActive: true,
    });
    customer = await AppDataSource.getRepository(User).save(customer);

    // Create test ticket (simplified - no customer dependency)
    ticket = AppDataSource.getRepository(Ticket).create({
      branchId: branch.id,
      customerId: '550e8400-e29b-41d4-a716-446655440000', // Mock customer ID
      ticketNumber: `TKT-NOTES-${Date.now()}`,
      subject: 'Test Ticket for Notes',
      description: 'Testing ticket notes functionality',
      statusId: '550e8400-e29b-41d4-a716-446655440001', // Mock status ID
      priorityId: '550e8400-e29b-41d4-a716-446655440002', // Mock priority ID
      categoryId: '550e8400-e29b-41d4-a716-446655440003', // Mock category ID
    });
    try {
      ticket = await AppDataSource.getRepository(Ticket).save(ticket);
    } catch (err) {
      // Ticket might fail due to foreign key constraints in test, that's okay
      // We'll use the mock IDs for testing the notes service
    }
  });

  afterAll(async () => {
    // Cleanup is optional for test database
    if (AppDataSource.isInitialized) {
      // Don't destroy - let the test runner handle cleanup
    }
  });

  describe('createNote', () => {
    it('should create a note with isInternal=true by default', async () => {
      const body = 'This is a test note';
      const note = await createNote(ticket.id, admin.id, body);

      expect(note.id).toBeDefined();
      expect(note.ticketId).toBe(ticket.id);
      expect(note.body).toBe(body);
      expect(note.isInternal).toBe(true);
      expect(note.author).toEqual({
        id: admin.id,
        fullNameEn: admin.fullNameEn,
        fullNameAr: admin.fullNameAr,
      });

      noteId = note.id;
    });

    it('should create a public note when isInternal=false', async () => {
      const body = 'This is a public note';
      const note = await createNote(ticket.id, admin.id, body, false);

      expect(note.isInternal).toBe(false);
      expect(note.body).toBe(body);
    });
  });

  describe('listNotes', () => {
    it('should list all notes including internal ones for non-customers', async () => {
      // Create both internal and public notes
      await createNote(ticket.id, admin.id, 'Internal note', true);
      await createNote(ticket.id, admin.id, 'Public note', false);

      const notes = await listNotes(ticket.id, true);

      expect(notes.length).toBeGreaterThanOrEqual(2);
      const hasInternal = notes.some(n => n.isInternal);
      const hasPublic = notes.some(n => !n.isInternal);
      expect(hasInternal).toBe(true);
      expect(hasPublic).toBe(true);
    });

    it('should exclude internal notes for customers', async () => {
      const notes = await listNotes(ticket.id, false);

      const hasInternal = notes.some(n => n.isInternal);
      expect(hasInternal).toBe(false);
    });

    it('should return notes in descending creation order', async () => {
      const notes = await listNotes(ticket.id, true);

      if (notes.length > 1) {
        for (let i = 0; i < notes.length - 1; i++) {
          expect(notes[i].createdAt.getTime()).toBeGreaterThanOrEqual(notes[i + 1].createdAt.getTime());
        }
      }
    });
  });

  describe('updateNote', () => {
    it('should update note body', async () => {
      const initialNote = await createNote(ticket.id, admin.id, 'Original text');
      const updatedNote = await updateNote(initialNote.id, 'Updated text');

      expect(updatedNote.id).toBe(initialNote.id);
      expect(updatedNote.body).toBe('Updated text');
    });

    it('should update isInternal flag', async () => {
      const note = await createNote(ticket.id, admin.id, 'Test', true);
      const updated = await updateNote(note.id, undefined, false);

      expect(updated.isInternal).toBe(false);
    });

    it('should update both fields together', async () => {
      const note = await createNote(ticket.id, admin.id, 'Original', true);
      const updated = await updateNote(note.id, 'New body', false);

      expect(updated.body).toBe('New body');
      expect(updated.isInternal).toBe(false);
    });
  });

  describe('deleteNote', () => {
    it('should soft delete a note', async () => {
      const note = await createNote(ticket.id, admin.id, 'To be deleted');
      const noteIdToDelete = note.id;

      await deleteNote(noteIdToDelete);

      // Should throw not found error after soft delete
      let found = false;
      try {
        await findNoteById(noteIdToDelete);
        found = true;
      } catch (err) {
        found = false;
      }
      expect(found).toBe(false);
    });
  });

  describe('findNoteById', () => {
    it('should find an existing note', async () => {
      const created = await createNote(ticket.id, admin.id, 'Findable note');
      const found = await findNoteById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.body).toBe('Findable note');
    });

    it('should throw NotFoundError for non-existent note', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      let error: Error | null = null;
      try {
        await findNoteById(fakeId);
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('not found');
    });
  });

  describe('toPublicTicketNote', () => {
    it('should convert TicketComment to public format', async () => {
      const note = await createNote(ticket.id, admin.id, 'Public conversion test');
      const entity = await AppDataSource.getRepository(TicketComment).findOne({
        where: { id: note.id },
        relations: { author: true },
      });

      const publicNote = toPublicTicketNote(entity as any);

      expect(publicNote.id).toBe(note.id);
      expect(publicNote.ticketId).toBe(ticket.id);
      expect(publicNote.body).toBe('Public conversion test');
      expect(publicNote.isInternal).toBeDefined();
      expect(publicNote.author).not.toBeNull();
    });
  });
});
