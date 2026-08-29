import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { Customer } from '../customer.entity';
import { CustomerNote } from '../customerNote.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';

describe('customerNotes — integration tests', () => {
  let adminToken: string;
  let agentToken: string;
  let adminUser: User;
  let agentUser: User;
  let branch1: Branch;
  let customer1: Customer;
  let customer2: Customer;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(CustomerNote).execute();
    await AppDataSource.createQueryBuilder().delete().from(Customer).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    const adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    const agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });

    adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-notes-admin@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Admin',
        fullNameAr: 'إداري',
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
        email: 'test-notes-agent@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Agent',
        fullNameAr: 'وكيل',
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
      email: 'test-notes-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-notes-agent@test.local',
      password: 'Test1234',
    });
    agentToken = res.body.data.accessToken;

    customer1 = await AppDataSource.getRepository(Customer).save(
      AppDataSource.getRepository(Customer).create({
        code: 'CUST_NOTES_TEST_1',
        fullNameEn: 'Test Customer 1',
        fullNameAr: 'عميل اختبار 1',
        branchId: branch1.id,
      }),
    );

    customer2 = await AppDataSource.getRepository(Customer).save(
      AppDataSource.getRepository(Customer).create({
        code: 'CUST_NOTES_TEST_2',
        fullNameEn: 'Test Customer 2',
        fullNameAr: 'عميل اختبار 2',
        branchId: branch1.id,
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creating a note stamps authorUserId from token', async () => {
    const res = await request(app)
      .post(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Test note' });

    expect(res.status).toBe(201);
    expect(res.body.data.author.id).toBe(adminUser.id);
  });

  it('author can edit their own note', async () => {
    const createRes = await request(app)
      .post(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Original note' });

    const noteId = createRes.body.data.id;

    const editRes = await request(app)
      .patch(`/api/v1/customers/${customer1.id}/notes/${noteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Updated note' });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.body).toBe('Updated note');
  });

  it("non-author cannot edit another user's note", async () => {
    const createRes = await request(app)
      .post(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Admin note' });

    const noteId = createRes.body.data.id;

    const editRes = await request(app)
      .patch(`/api/v1/customers/${customer1.id}/notes/${noteId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ body: 'Agent edit attempt' });

    expect(editRes.status).toBe(403);
  });

  it("administrator can delete another user's note", async () => {
    const createRes = await request(app)
      .post(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ body: 'Agent note' });

    const noteId = createRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/v1/customers/${customer1.id}/notes/${noteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);
  });

  it('note from another customer returns 404', async () => {
    const createRes = await request(app)
      .post(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Note on customer 1' });

    const noteId = createRes.body.data.id;

    const patchRes = await request(app)
      .patch(`/api/v1/customers/${customer2.id}/notes/${noteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Attempt to edit from wrong customer' });

    expect(patchRes.status).toBe(403);
  });

  it('notes include populated author without passwordHash', async () => {
    const res = await request(app)
      .get(`/api/v1/customers/${customer1.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const note = res.body.data[0];
    expect(note.author).toBeDefined();
    expect(note.author.fullNameEn).toBeDefined();
    expect(note.author.fullNameAr).toBeDefined();
    expect(Object.keys(note).includes('passwordHash')).toBe(false);
  });
});
