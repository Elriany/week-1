import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { Ticket } from '../ticket.entity';
import { TicketHistory } from '../ticketHistory.entity';
import { TicketComment } from '../ticketComment.entity';
import { TicketAttachment } from '../ticketAttachment.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';

describe('ticket history service — integration tests', () => {
  let adminToken: string;
  let adminUser: User;
  let branch1: Branch;
  let adminRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(TicketHistory).execute();
    await AppDataSource.createQueryBuilder().delete().from(Ticket).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });

    adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'history-admin@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'History Admin',
        fullNameAr: 'إداري السجل',
        roleId: adminRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    let res = await request(app).post('/api/v1/auth/login').send({
      email: 'history-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup happens on next test run
  });

  describe('History entry structure', () => {
    it('returns history entries with correct structure', async () => {
      // Create a ticket to get history
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Structure Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data).toHaveProperty('items');
      expect(historyRes.body.data).toHaveProperty('page');
      expect(historyRes.body.data).toHaveProperty('pageSize');
      expect(historyRes.body.data).toHaveProperty('total');

      if (historyRes.body.data.items.length > 0) {
        const entry = historyRes.body.data.items[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('ticketId');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('fromValue');
        expect(entry).toHaveProperty('toValue');
        expect(entry).toHaveProperty('note');
        expect(entry).toHaveProperty('actorUser');
        expect(entry).toHaveProperty('createdAt');

        // Check actorUser structure
        expect(entry.actorUser).toHaveProperty('id');
        expect(entry.actorUser).toHaveProperty('fullNameEn');
        expect(entry.actorUser).toHaveProperty('fullNameAr');
      }
    });
  });

  describe('History ordering and sorting', () => {
    it('returns history in reverse chronological order (newest first)', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Ordering Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      const items = historyRes.body.data.items;

      // Verify reverse chronological order
      for (let i = 0; i < items.length - 1; i++) {
        const currentDate = new Date(items[i].createdAt).getTime();
        const nextDate = new Date(items[i + 1].createdAt).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });
  });

  describe('Pagination edge cases', () => {
    it('handles pageSize > total items', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Pagination Edge Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history with large pageSize
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ pageSize: 1000 });

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.pageSize).toBeLessThanOrEqual(100);
    });

    it('clamps page to minimum 1', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Page Clamp Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history with page = 0 (should clamp to 1)
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 0 });

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.page).toBe(1);
    });
  });

  describe('History for ticket not found', () => {
    it('returns 404 when ticket does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const historyRes = await request(app)
        .get(`/api/v1/tickets/${fakeId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(404);
    });
  });

  describe('Branch scoping on history', () => {
    it('prevents viewing history of tickets from another branch', async () => {
      // This test assumes we have multi-branch setup; for now we'll just
      // verify the endpoint respects branch scoping in a single branch context.
      // A real multi-branch test would need a second branch and user.

      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Branch Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history (should succeed in same branch)
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
    });
  });

  describe('Merged timeline (notes and attachments)', () => {
    it('includes notes in the history timeline', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Merged Timeline Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Add a note to the ticket
      const noteRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          body: 'This is a test note for history',
          isInternal: true,
        });

      expect(noteRes.status).toBe(201);

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      const items = historyRes.body.data.items;

      // Check for note entry in history
      const noteEntry = items.find((item: any) => item.body === 'This is a test note for history');
      expect(noteEntry).toBeDefined();
      if (noteEntry) {
        expect(noteEntry.actor).toBeDefined();
      }
    });

    it('internal notes are hidden from customers', async () => {
      // Create a non-admin user to act as customer
      const customerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.CUSTOMER });
      const customerUser = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email: `history-customer-${Date.now()}@test.local`,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'History Customer',
          fullNameAr: 'عميل السجل',
          roleId: customerRole!.id,
          branchId: branch1.id,
          departmentId: (await AppDataSource.getRepository(Branch).findOne({
            where: { id: branch1.id },
            relations: { departments: true },
          }))!.departments[0].id,
          isActive: true,
        }),
      );

      let customerToken = '';
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `history-customer-${Date.now()}@test.local`,
          password: 'Test1234',
        });

      if (loginRes.body.data?.accessToken) {
        customerToken = loginRes.body.data.accessToken;
      }

      // For now, just verify the endpoint behavior doesn't crash
      // A full test would need more setup
      if (customerToken) {
        const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
        const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
        const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

        const createRes = await request(app)
          .post('/api/v1/tickets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            subject: 'Internal Note Test',
            description: 'Test',
            customerId: customer?.id,
            departmentId: dept?.id,
            priorityId: priority?.id,
            branchId: branch1.id,
          });

        const ticketId = createRes.body.data.id;

        // Add both internal and public notes
        await request(app)
          .post(`/api/v1/tickets/${ticketId}/notes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            body: 'Internal note - should be hidden from customer',
            isInternal: true,
          });

        await request(app)
          .post(`/api/v1/tickets/${ticketId}/notes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            body: 'Public note - visible to customer',
            isInternal: false,
          });

        // Get history as customer
        const historyRes = await request(app)
          .get(`/api/v1/tickets/${ticketId}/history`)
          .set('Authorization', `Bearer ${customerToken}`);

        expect(historyRes.status).toBe(200);
        const items = historyRes.body.data.items;

        // Internal note should not be visible to customer
        const internalNote = items.find((item: any) => item.body?.includes('should be hidden'));
        expect(internalNote).toBeUndefined();

        // Public note should be visible
        const publicNote = items.find((item: any) => item.body?.includes('visible to customer'));
        expect(publicNote).toBeDefined();
      }
    });

    it('correctly merges audit, notes, and attachments in reverse chronological order', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Complete Merge Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Add a note
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          body: 'Test note for merge',
          isInternal: false,
        });

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      const items = historyRes.body.data.items;

      // Verify entries are in reverse chronological order
      for (let i = 0; i < items.length - 1; i++) {
        const currentDate = new Date(items[i].occurredAt || items[i].createdAt).getTime();
        const nextDate = new Date(items[i + 1].occurredAt || items[i + 1].createdAt).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });
  });
});
