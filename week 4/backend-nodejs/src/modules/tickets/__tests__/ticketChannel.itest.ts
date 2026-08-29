import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { Customer } from '../../customers/customer.entity';
import { TicketPriority } from '../ticketPriority.entity';
import { Department } from '../../departments/department.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';

describe('ticket channel — integration tests', () => {
  let adminToken: string;
  let branch1: Branch;
  let dept: Department;
  let customer: Customer;
  let priority: TicketPriority;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    dept = (await AppDataSource.getRepository(Branch).findOne({
      where: { id: branch1.id },
      relations: { departments: true },
    }))!.departments[0];
    customer = await AppDataSource.getRepository(Customer).findOneBy({ branchId: branch1.id });
    priority = await AppDataSource.getRepository(TicketPriority).findOneBy({ code: 'MEDIUM' });

    const adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    const email = 'test-admin-channel@test.local';
    let adminUser = await AppDataSource.getRepository(User).findOneBy({ email });
    if (!adminUser) {
      adminUser = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Test Admin Channel',
          fullNameAr: 'اختبار إداري',
          roleId: adminRole.id,
          branchId: branch1.id,
          departmentId: dept.id,
          isActive: true,
        }),
      );
    }

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test1234' });
    adminToken = res.body.data.accessToken;
  });

  it('stores WEB when no channel is supplied', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'No channel supplied',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.channel).toBe('WEB');
  });

  it('stores PHONE when supplied, and rejects an unknown channel with 422', async () => {
    const phoneRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Phone channel',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
        channel: 'PHONE',
      });
    expect(phoneRes.status).toBe(201);
    expect(phoneRes.body.data.channel).toBe('PHONE');

    const badRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Bad channel',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
        channel: 'SMS',
      });
    expect(badRes.status).toBe(422);
  });

  it('filters GET /tickets by channel', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Filter by channel test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
        channel: 'EMAIL',
      });
    expect(created.status).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ channel: 'EMAIL' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items.every((t: any) => t.channel === 'EMAIL')).toBe(true);
    expect(listRes.body.data.items.some((t: any) => t.id === created.body.data.id)).toBe(true);

    const badFilter = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ channel: 'SMS' });
    expect(badFilter.status).toBe(422);
  });

  it('includes channel on GET /tickets/:id', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Get by id channel test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });

    const getRes = await request(app)
      .get(`/api/v1/tickets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.channel).toBe('WEB');
  });
});
