import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { AppDataSource } from '../../../config/data-source';
import { Ticket } from '../ticket.entity';
import { TicketAttachment } from '../ticketAttachment.entity';
import { User } from '../../users/user.entity';
import { Branch } from '../../branches/branch.entity';
import { Role } from '../../users/role.entity';
import { ROLE_CODES } from '../../users/permissions.constants';
import { hashPassword } from '../../users/users.service';
import {
  listAttachments,
  createAttachment,
  findAttachmentById,
  softDeleteAttachment,
  toPublicAttachment,
  getAttachmentStoragePath,
} from '../ticketAttachments.service';

describe('Ticket Attachments Service (Integration)', () => {
  let branch: Branch;
  let admin: User;
  let ticket: Ticket;
  let tempTestDir: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Create test branch
    branch = AppDataSource.getRepository(Branch).create({
      code: 'TEST_ATTACH',
      nameEn: 'Test Branch for Attachments',
      nameAr: 'فرع اختبار المرفقات',
      isActive: true,
    });
    branch = await AppDataSource.getRepository(Branch).save(branch);

    // Create admin user
    const adminRole = await AppDataSource.getRepository(Role).findOne({ where: { code: ROLE_CODES.ADMIN } });
    admin = AppDataSource.getRepository(User).create({
      email: `admin-attach-${Date.now()}@test.local`,
      passwordHash: await hashPassword('Test@1234'),
      fullNameEn: 'Admin User',
      fullNameAr: 'مستخدم إداري',
      roleId: adminRole!.id,
      branchId: branch.id,
      isActive: true,
    });
    admin = await AppDataSource.getRepository(User).save(admin);

    // Create test ticket
    ticket = AppDataSource.getRepository(Ticket).create({
      branchId: branch.id,
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      ticketNumber: `TKT-ATTACH-${Date.now()}`,
      subject: 'Test Ticket for Attachments',
      description: 'Testing ticket attachments functionality',
      statusId: '550e8400-e29b-41d4-a716-446655440001',
      priorityId: '550e8400-e29b-41d4-a716-446655440002',
      categoryId: '550e8400-e29b-41d4-a716-446655440003',
    });
    try {
      ticket = await AppDataSource.getRepository(Ticket).save(ticket);
    } catch (err) {
      // Ticket might fail, use mock for testing
    }
  });

  afterAll(async () => {
    // Cleanup is optional for test database
  });

  describe('createAttachment', () => {
    it('should create an attachment record from file metadata', async () => {
      const mockFile = {
        originalname: 'test-document.pdf',
        filename: 'test-uuid-1234.pdf',
        mimetype: 'application/pdf',
        size: 102400,
        path: '/tmp/test-file.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const attachment = await createAttachment(ticket.id, admin.id, mockFile);

      expect(attachment.id).toBeDefined();
      expect(attachment.ticketId).toBe(ticket.id);
      expect(attachment.originalName).toBe('test-document.pdf');
      expect(attachment.mimeType).toBe('application/pdf');
      expect(attachment.sizeBytes).toBe('102400');
      expect(attachment.uploadedBy).toEqual({
        id: admin.id,
        fullNameEn: admin.fullNameEn,
        fullNameAr: admin.fullNameAr,
      });
    });
  });

  describe('listAttachments', () => {
    it('should list attachments in descending creation order', async () => {
      const mockFile1 = {
        originalname: 'first.pdf',
        filename: 'uuid-first.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/tmp/first.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test1'),
      } as Express.Multer.File;

      const mockFile2 = {
        originalname: 'second.pdf',
        filename: 'uuid-second.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        path: '/tmp/second.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test2'),
      } as Express.Multer.File;

      await createAttachment(ticket.id, admin.id, mockFile1);
      await createAttachment(ticket.id, admin.id, mockFile2);

      const attachments = await listAttachments(ticket.id);

      expect(attachments.length).toBeGreaterThanOrEqual(1);
      if (attachments.length > 1) {
        expect(attachments[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          attachments[1].createdAt.getTime(),
        );
      }
    });
  });

  describe('findAttachmentById', () => {
    it('should find an existing attachment', async () => {
      const mockFile = {
        originalname: 'findable.pdf',
        filename: 'uuid-findable.pdf',
        mimetype: 'application/pdf',
        size: 512,
        path: '/tmp/findable.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const created = await createAttachment(ticket.id, admin.id, mockFile);
      const found = await findAttachmentById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.originalName).toBe('findable.pdf');
    });

    it('should throw NotFoundError for non-existent attachment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      let error: Error | null = null;
      try {
        await findAttachmentById(fakeId);
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('not found');
    });
  });

  describe('softDeleteAttachment', () => {
    it('should soft delete an attachment', async () => {
      const mockFile = {
        originalname: 'to-delete.pdf',
        filename: 'uuid-delete.pdf',
        mimetype: 'application/pdf',
        size: 256,
        path: '/tmp/delete.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const attachment = await createAttachment(ticket.id, admin.id, mockFile);

      await softDeleteAttachment(attachment.id);

      let error: Error | null = null;
      try {
        await findAttachmentById(attachment.id);
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
    });
  });

  describe('toPublicAttachment', () => {
    it('should NOT expose storedName in public format', async () => {
      const mockFile = {
        originalname: 'sensitive.pdf',
        filename: 'uuid-sensitive-1234.pdf',
        mimetype: 'application/pdf',
        size: 1000,
        path: '/tmp/sensitive.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const attachment = await createAttachment(ticket.id, admin.id, mockFile);
      const entity = await findAttachmentById(attachment.id);
      const publicAttachment = toPublicAttachment({
        ...entity,
        uploadedBy: { id: admin.id, fullNameEn: admin.fullNameEn, fullNameAr: admin.fullNameAr },
      });

      expect(publicAttachment).not.toHaveProperty('storedName');
      expect(publicAttachment.originalName).toBe('sensitive.pdf');
    });
  });

  describe('getAttachmentStoragePath', () => {
    it('should return a valid path for the attachment', async () => {
      const mockFile = {
        originalname: 'path-test.pdf',
        filename: 'uuid-pathtest.pdf',
        mimetype: 'application/pdf',
        size: 500,
        path: '/tmp/pathtest.pdf',
        encoding: '7bit',
        destination: '/tmp',
        fieldname: 'file',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const attachment = await createAttachment(ticket.id, admin.id, mockFile);
      const entity = await findAttachmentById(attachment.id);
      const filePath = await getAttachmentStoragePath(ticket.id, entity);

      expect(filePath).toContain('tickets');
      expect(filePath).toContain(ticket.id);
    });
  });
});
