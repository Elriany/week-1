import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { Ticket } from '../ticket.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';

describe('tickets — integration tests', () => {
  let adminToken: string;
  let agentToken: string;
  let customerToken: string;
  let branch1: Branch;
  let adminRole: Role;
  let agentRole: Role;
  let customerRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(Ticket).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });
    customerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.CUSTOMER });

    const adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-admin-tkt@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Test Admin',
        fullNameAr: 'اختبار إداري',
        roleId: adminRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    const agentUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-agent-tkt@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Test Agent',
        fullNameAr: 'وكيل اختبار',
        roleId: agentRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    const customerUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-customer-tkt@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Test Customer',
        fullNameAr: 'اختبار عميل',
        roleId: customerRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    let res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-admin-tkt@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-agent-tkt@test.local',
      password: 'Test1234',
    });
    agentToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-customer-tkt@test.local',
      password: 'Test1234',
    });
    customerToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup happens on next test run
  });

  describe('POST / — create ticket', () => {
    it('returns 201 with TKT-<year>-<seq> and NEW status and null assignee', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          subject: 'Test Ticket',
          description: 'Test description',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
      expect(res.body.status.code).toBe('NEW');
      expect(res.body.assignedUserId).toBeNull();
    });

    it('sequential creates produce consecutive numbers', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const numbers: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/tickets')
          .set('Authorization', `Bearer ${agentToken}`)
          .send({
            subject: `Sequential ${i}`,
            description: 'test',
            customerId: customer?.id,
            departmentId: dept?.id,
            priorityId: priority?.id,
            branchId: branch1.id,
          });
        expect(res.status).toBe(201);
        numbers.push(res.body.ticketNumber);
      }

      const seqs = numbers.map(n => parseInt(n.split('-')[2], 10));
      expect(seqs[1]).toBe(seqs[0] + 1);
      expect(seqs[2]).toBe(seqs[1] + 1);
    });

    it('CUSTOMER role gets 403 on create', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Customer ticket',
          description: 'test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET / — list tickets', () => {
    it('list respects branchId for all users', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ branchId: branch1.id });

      expect(res.status).toBe(200);
      // Non-admin should get their branch regardless of branchId param
      expect(res.body.data.every((t: any) => t.branchId === branch1.id)).toBe(true);
    });

    it('search on ticketNumber', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const created = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          subject: 'Searchable TKT',
          description: 'test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const number = created.body.ticketNumber;
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ q: number });

      expect(res.status).toBe(200);
      expect(res.body.data.some((t: any) => t.ticketNumber === number)).toBe(true);
    });

    it('search on subject', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ q: 'Searchable' });

      expect(res.status).toBe(200);
    });

    it('unassigned filter works', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ unassigned: 'true' });

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((t: any) => t.assignedUserId === null)).toBe(true);
      }
    });

    it('sorting by createdAt asc', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ sortBy: 'createdAt', sortDir: 'asc', pageSize: 100 });

      expect(res.status).toBe(200);
      if (res.body.data.length > 1) {
        const dates = res.body.data.map((t: any) => new Date(t.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
        }
      }
    });

    it('pagination works with page and pageSize', async () => {
      const res1 = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ page: 1, pageSize: 2 });

      const res2 = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ page: 2, pageSize: 2 });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('response does not contain passwordHash', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ page: 1 });

      expect(res.status).toBe(200);
      for (const ticket of res.body.data) {
        if (ticket.customer) {
          expect(ticket.customer).not.toHaveProperty('passwordHash');
        }
        if (ticket.assignedUser) {
          expect(ticket.assignedUser).not.toHaveProperty('passwordHash');
        }
      }
    });
  });

  describe('GET /meta', () => {
    it('returns six statuses with correct codes', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.statuses).toHaveLength(6);
      const codes = res.body.statuses.map((s: any) => s.code);
      expect(codes).toContain('NEW');
      expect(codes).toContain('ASSIGNED');
      expect(codes).toContain('IN_PROGRESS');
      expect(codes).toContain('PENDING_CUSTOMER');
      expect(codes).toContain('RESOLVED');
      expect(codes).toContain('CLOSED');
    });

    it('returns priorities ordered by sortOrder', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      const orders = res.body.priorities.map((p: any) => p.sortOrder);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('returns categories ordered by sortOrder', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/meta')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      if (res.body.categories && res.body.categories.length > 0) {
        const orders = res.body.categories.map((c: any) => c.sortOrder);
        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
        }
      }
    });
  });

  describe('GET /:id', () => {
    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:id — update ticket', () => {
    it('rejects update without at least one field', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const ticket = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          subject: 'Updateable',
          description: 'test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.body.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('updates subject field', async () => {
      const customer = await AppDataSource.getRepository('Customer').findOne({ where: {} });
      const priority = await AppDataSource.getRepository('TicketPriority').findOne({ where: {} });
      const dept = await AppDataSource.getRepository('Department').findOne({ where: {} });

      const ticket = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          subject: 'Original',
          description: 'test',
          customerId: customer?.id,
          departmentId: dept?.id,
          priorityId: priority?.id,
          branchId: branch1.id,
        });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.body.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ subject: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.subject).toBe('Updated');
    });
  });
});
