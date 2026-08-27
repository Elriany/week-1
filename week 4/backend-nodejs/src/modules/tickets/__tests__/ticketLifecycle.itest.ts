import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { Ticket } from '../ticket.entity';
import { TicketHistory } from '../ticketHistory.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';
import { TICKET_STATUS_CODES } from '../ticket.constants';

describe('ticket lifecycle — integration tests', () => {
  let adminToken: string;
  let agentToken: string;
  let branch1: Branch;
  let adminUser: User;
  let agentUser: User;
  let adminRole: Role;
  let agentRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(TicketHistory).execute();
    await AppDataSource.createQueryBuilder().delete().from(Ticket).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });

    adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'lifecycle-admin@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Lifecycle Admin',
        fullNameAr: 'إداري دورة الحياة',
        roleId: adminRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    agentUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'lifecycle-agent@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Lifecycle Agent',
        fullNameAr: 'وكيل دورة الحياة',
        roleId: agentRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    let res = await request(app).post('/api/v1/auth/login').send({
      email: 'lifecycle-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'lifecycle-agent@test.local',
      password: 'Test1234',
    });
    agentToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup happens on next test run
  });

  describe('PATCH /:id/status — status transition', () => {
    it('allows transition from NEW to IN_PROGRESS', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Transition Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;
      const newStatusId = createRes.body.data.status.id;

      // Get IN_PROGRESS status
      const metaRes = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${adminToken}`);

      const inProgressStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.IN_PROGRESS);

      // Transition to IN_PROGRESS
      const transitionRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          statusId: inProgressStatus.id,
          note: 'Starting work on this issue',
        });

      expect(transitionRes.status).toBe(200);
      expect(transitionRes.body.data.status.code).toBe(TICKET_STATUS_CODES.IN_PROGRESS);
    });

    it('rejects invalid transitions (NEW → RESOLVED is not allowed)', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Invalid Transition Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get RESOLVED status
      const metaRes = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${adminToken}`);

      const resolvedStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.RESOLVED);

      // Try to transition directly to RESOLVED (should fail)
      const transitionRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: resolvedStatus.id });

      expect(transitionRes.status).toBe(409);
    });

    it('no-ops on same-status transition', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'No-op Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;
      const currentStatusId = createRes.body.data.status.id;

      // Transition to same status
      const transitionRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: currentStatusId });

      expect(transitionRes.status).toBe(200);
      expect(transitionRes.body.data.status.id).toBe(currentStatusId);
    });

    it('prevents transitions from CLOSED (terminal)', async () => {
      // Create and transition to CLOSED
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Close Terminal Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get statuses
      const metaRes = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${adminToken}`);

      const inProgressStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.IN_PROGRESS);
      const closedStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.CLOSED);

      // Transition NEW → IN_PROGRESS
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: inProgressStatus.id });

      // Transition IN_PROGRESS → CLOSED
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: closedStatus.id });

      // Try to transition from CLOSED (should fail)
      const failRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: inProgressStatus.id });

      expect(failRes.status).toBe(409);
    });
  });

  describe('GET /:id/history — audit trail', () => {
    it('records status transitions in history', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'History Recording Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get IN_PROGRESS status and transition
      const metaRes = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${adminToken}`);

      const inProgressStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.IN_PROGRESS);

      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          statusId: inProgressStatus.id,
          note: 'Testing history recording',
        });

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.items).toBeDefined();
      expect(historyRes.body.data.items.length).toBeGreaterThan(0);

      // Check for STATUS_CHANGED entry
      const statusChanged = historyRes.body.data.items.find((h: any) => h.action === 'STATUS_CHANGED');
      expect(statusChanged).toBeDefined();
      expect(statusChanged.fromValue).toBe(TICKET_STATUS_CODES.NEW);
      expect(statusChanged.toValue).toBe(TICKET_STATUS_CODES.IN_PROGRESS);
      expect(statusChanged.note).toBe('Testing history recording');
    });

    it('paginates history correctly', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Pagination Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Get history with pagination
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data).toHaveProperty('page');
      expect(historyRes.body.data).toHaveProperty('pageSize');
      expect(historyRes.body.data).toHaveProperty('total');
      expect(historyRes.body.data.page).toBe(1);
      expect(historyRes.body.data.pageSize).toBe(10);
    });
  });
});
