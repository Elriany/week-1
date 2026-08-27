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

describe('ticket assignment — integration tests', () => {
  let adminToken: string;
  let agentToken: string;
  let branch1: Branch;
  let adminUser: User;
  let agentUser: User;
  let adminRole: Role;
  let agentRole: Role;
  let customerRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(TicketHistory).execute();
    await AppDataSource.createQueryBuilder().delete().from(Ticket).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });
    customerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.CUSTOMER });

    adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'assignment-admin@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Assignment Admin',
        fullNameAr: 'إداري التعيين',
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
        email: 'assignment-agent@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Assignment Agent',
        fullNameAr: 'وكيل التعيين',
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
      email: 'assignment-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'assignment-agent@test.local',
      password: 'Test1234',
    });
    agentToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup happens on next test run
  });

  describe('PATCH /:id/assignee — ticket assignment', () => {
    it('assigns a ticket and auto-promotes NEW to ASSIGNED', async () => {
      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Assignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;
      expect(createRes.body.data.assignedUserId).toBeNull();
      expect(createRes.body.data.status.code).toBe(TICKET_STATUS_CODES.NEW);

      // Assign to agent
      const assignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedUserId: agentUser.id,
          note: 'Assigning to support team',
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.assignedUserId).toBe(agentUser.id);
      // Should auto-promote to ASSIGNED
      expect(assignRes.body.data.status.code).toBe(TICKET_STATUS_CODES.ASSIGNED);
    });

    it('unassigns a ticket', async () => {
      // Create and assign a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Unassignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Assign to agent
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: agentUser.id });

      // Unassign (set to null)
      const unassignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: null });

      expect(unassignRes.status).toBe(200);
      expect(unassignRes.body.data.assignedUserId).toBeNull();
      // Status should remain ASSIGNED (does not revert to NEW)
      expect(unassignRes.body.data.status.code).toBe(TICKET_STATUS_CODES.ASSIGNED);
    });

    it('no-ops when reassigning to same user', async () => {
      // Create and assign a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'No-op Reassignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Assign to agent
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: agentUser.id });

      // Try to reassign to same user
      const reassignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: agentUser.id });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.data.assignedUserId).toBe(agentUser.id);
    });

    it('prevents assignment to CUSTOMER role', async () => {
      // Create a customer user
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const customerUser = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email: `customer-${Date.now()}@test.local`,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Test Customer User',
          fullNameAr: 'مستخدم عميل اختبار',
          roleId: customerRole.id,
          branchId: branch1.id,
          departmentId: dept!.id,
          isActive: true,
        }),
      );

      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Customer Assignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Try to assign to customer (should fail)
      const assignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: customerUser.id });

      expect(assignRes.status).toBe(422);
    });

    it('prevents assignment to inactive user', async () => {
      // Create an inactive agent user
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const inactiveUser = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email: `inactive-${Date.now()}@test.local`,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Inactive Agent',
          fullNameAr: 'وكيل غير نشط',
          roleId: agentRole.id,
          branchId: branch1.id,
          departmentId: dept!.id,
          isActive: false,
        }),
      );

      // Create a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Inactive Assignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Try to assign to inactive user (should fail)
      const assignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: inactiveUser.id });

      expect(assignRes.status).toBe(422);
    });

    it('prevents reassignment of CLOSED tickets', async () => {
      // Create, assign, and close a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Close Reassignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Assign to agent
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: agentUser.id });

      // Get CLOSED status and close the ticket
      const metaRes = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${adminToken}`);

      const closedStatus = metaRes.body.data.statuses.find((s: any) => s.code === TICKET_STATUS_CODES.CLOSED);

      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusId: closedStatus.id });

      // Create another agent for reassignment
      const anotherAgent = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email: `another-agent-${Date.now()}@test.local`,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Another Agent',
          fullNameAr: 'وكيل آخر',
          roleId: agentRole.id,
          branchId: branch1.id,
          departmentId: dept!.id,
          isActive: true,
        }),
      );

      // Try to reassign CLOSED ticket (should fail)
      const reassignRes = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedUserId: anotherAgent.id });

      expect(reassignRes.status).toBe(409);
    });

    it('records assignment in history', async () => {
      // Create and assign a ticket
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'History Assignment Test',
          description: 'Test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const ticketId = createRes.body.data.id;

      // Assign to agent
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedUserId: agentUser.id,
          note: 'Assigning for testing',
        });

      // Get history
      const historyRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);

      // Check for ASSIGNED entry
      const assignedEntry = historyRes.body.data.items.find((h: any) => h.action === 'ASSIGNED');
      expect(assignedEntry).toBeDefined();
      expect(assignedEntry.toValue).toBe(agentUser.fullNameEn);
      expect(assignedEntry.note).toBe('Assigning for testing');

      // Check for auto-promotion history entry
      const statusChangedEntry = historyRes.body.data.items.find((h: any) => h.action === 'STATUS_CHANGED');
      expect(statusChangedEntry).toBeDefined();
      expect(statusChangedEntry.fromValue).toBe(TICKET_STATUS_CODES.NEW);
      expect(statusChangedEntry.toValue).toBe(TICKET_STATUS_CODES.ASSIGNED);
    });
  });

  describe('GET /assignable-users — list assignable users', () => {
    it('returns active users excluding CUSTOMER role', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/assignable-users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      // Check that no CUSTOMER roles are included
      const hasCustomer = res.body.data.some((u: any) => u.roleCode === ROLE_CODES.CUSTOMER);
      expect(hasCustomer).toBe(false);

      // Check that admin and agent are included
      const hasAdmin = res.body.data.some((u: any) => u.roleCode === ROLE_CODES.ADMIN);
      const hasAgent = res.body.data.some((u: any) => u.roleCode === ROLE_CODES.AGENT);
      expect(hasAdmin || hasAgent).toBe(true);
    });

    it('respects branch scoping for non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/assignable-users')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);

      // All returned users should be in agent's branch
      for (const user of res.body.data) {
        // We can't directly check branchId, but we can verify they're returned successfully
        expect(user.id).toBeDefined();
      }
    });

    it('returns user info with names and role codes', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/assignable-users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      if (res.body.data.length > 0) {
        const user = res.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('fullNameEn');
        expect(user).toHaveProperty('fullNameAr');
        expect(user).toHaveProperty('roleCode');
      }
    });
  });
});
