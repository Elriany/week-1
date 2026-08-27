import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { Customer } from '../customer.entity';
import { CustomerContact } from '../customerContact.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES } from '../../users/permissions.constants';

describe('customerContacts — integration tests', () => {
  let adminToken: string;
  let managerToken: string;
  let branch1: Branch;
  let branch2: Branch;
  let customer1: Customer;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.createQueryBuilder().delete().from(CustomerContact).execute();
    await AppDataSource.createQueryBuilder().delete().from(Customer).execute();

    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    branch2 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'RIYADH' });
    const adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    const managerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.MANAGER });

    const adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-contacts-admin@test.local',
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

    const managerUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-contacts-manager@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Manager',
        fullNameAr: 'مدير',
        roleId: managerRole.id,
        branchId: branch1.id,
        departmentId: (await AppDataSource.getRepository(Branch).findOne({
          where: { id: branch1.id },
          relations: { departments: true },
        }))!.departments[0].id,
        isActive: true,
      }),
    );

    let res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-contacts-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-contacts-manager@test.local',
      password: 'Test1234',
    });
    managerToken = res.body.data.accessToken;

    customer1 = await AppDataSource.getRepository(Customer).save(
      AppDataSource.getRepository(Customer).create({
        code: 'CUST_CONTACT_TEST',
        fullNameEn: 'Test Customer',
        fullNameAr: 'عميل اختبار',
        branchId: branch1.id,
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creating a contact with isPrimary: true demotes existing primary', async () => {
    const res1 = await request(app)
      .post(`/api/v1/customers/${customer1.id}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullNameEn: 'Primary Contact 1',
        fullNameAr: 'جهة اتصال أساسية 1',
        isPrimary: true,
      });
    expect(res1.status).toBe(201);
    expect(res1.body.data.isPrimary).toBe(true);

    const res2 = await request(app)
      .post(`/api/v1/customers/${customer1.id}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullNameEn: 'Primary Contact 2',
        fullNameAr: 'جهة اتصال أساسية 2',
        isPrimary: true,
      });
    expect(res2.status).toBe(201);
    expect(res2.body.data.isPrimary).toBe(true);

    const listRes = await request(app)
      .get(`/api/v1/customers/${customer1.id}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const primaries = listRes.body.data.filter((c: any) => c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].fullNameEn).toBe('Primary Contact 2');
  });

  it('contacts are ordered primary-first', async () => {
    const listRes = await request(app)
      .get(`/api/v1/customers/${customer1.id}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    expect(listRes.body.data[0].isPrimary).toBe(true);
  });
});
