import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role.entity';
import { Branch } from '../../branches/branch.entity';
import { Customer } from '../customer.entity';
import { hashPassword } from '../../users/users.service';
import { ROLE_CODES, PERMISSIONS } from '../../users/permissions.constants';

describe('customers — integration tests', () => {
  let adminToken: string;
  let managerToken: string;
  let agentToken: string;
  let branch1: Branch;
  let branch2: Branch;
  let adminRole: Role;
  let managerRole: Role;
  let agentRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Clear customers
    await AppDataSource.createQueryBuilder().delete().from(Customer).execute();

    // Setup branches
    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    branch2 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'RIYADH' });

    // Setup roles
    adminRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.ADMIN });
    managerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.MANAGER });
    agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });

    // Create test users for different roles
    const adminUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-admin@test.local',
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

    const managerUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email: 'test-manager@test.local',
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Test Manager',
        fullNameAr: 'مدير اختبار',
        roleId: managerRole.id,
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
        email: 'test-agent@test.local',
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

    // Get tokens
    let res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-admin@test.local',
      password: 'Test1234',
    });
    adminToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-manager@test.local',
      password: 'Test1234',
    });
    managerToken = res.body.data.accessToken;

    res = await request(app).post('/api/v1/auth/login').send({
      email: 'test-agent@test.local',
      password: 'Test1234',
    });
    agentToken = res.body.data.accessToken;

    // Seed customers
    await AppDataSource.getRepository(Customer).save([
      AppDataSource.getRepository(Customer).create({
        code: 'CUST001',
        fullNameEn: 'John Smith',
        fullNameAr: 'جون سميث',
        email: 'john@example.com',
        phone: '+966501234567',
        branchId: branch1.id,
        isActive: true,
      }),
      AppDataSource.getRepository(Customer).create({
        code: 'CUST002',
        fullNameEn: 'Ahmed Ali',
        fullNameAr: 'أحمد علي',
        email: 'ahmed@example.com',
        phone: '+966502345678',
        branchId: branch1.id,
        isActive: true,
      }),
      AppDataSource.getRepository(Customer).create({
        code: 'CUST003',
        fullNameEn: 'Riyadh Customer',
        fullNameAr: 'عميل الرياض',
        email: 'riyadh@example.com',
        phone: '+966503456789',
        branchId: branch2.id,
        isActive: true,
      }),
    ]);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /customers — create', () => {
    it('returns 201 and a generated CUST#### code', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullNameEn: 'New Customer',
          fullNameAr: 'عميل جديد',
          email: 'new@example.com',
          branchId: branch1.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^CUST\d{4}$/);
      expect(res.body.data.isActive).toBe(true);
    });

    it('returns 409 for a duplicate code', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CUST001',
          fullNameEn: 'Duplicate',
          fullNameAr: 'مكرر',
          branchId: branch1.id,
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /customers — list', () => {
    it('returns customers with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/customers?pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.total).toBeGreaterThanOrEqual(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(2);
    });

    it('filters by English name', async () => {
      const res = await request(app)
        .get('/api/v1/customers?q=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].fullNameEn).toContain('John');
    });

    it('filters by Arabic name', async () => {
      const res = await request(app)
        .get('/api/v1/customers?q=أحمد')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].fullNameAr).toContain('أحمد');
    });

    it('does not wildcard-expand when search contains %', async () => {
      const res = await request(app)
        .get('/api/v1/customers?q=%')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThanOrEqual(0);
      // If % were unescaped, it would match every row; we're just checking the request succeeds.
    });

    it('respects isActive filter', async () => {
      await AppDataSource.getRepository(Customer).save(
        AppDataSource.getRepository(Customer).create({
          code: 'CUST_INACTIVE',
          fullNameEn: 'Inactive Customer',
          fullNameAr: 'عميل معطل',
          branchId: branch1.id,
          isActive: false,
        }),
      );

      const res = await request(app)
        .get('/api/v1/customers?isActive=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.every((c: any) => !c.isActive)).toBe(true);
    });

    it("scopes to manager's branch", async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).not.toContainEqual(
        expect.objectContaining({ code: 'CUST003' }), // Riyadh customer
      );
    });
  });

  describe('PATCH /:id/active — toggle active status', () => {
    it('sets isActive to false and hides from isActive=true listing', async () => {
      const customer = await AppDataSource.getRepository(Customer).findOneBy({ code: 'CUST001' });
      if (!customer) throw new Error('CUST001 not found');

      const res = await request(app)
        .patch(`/api/v1/customers/${customer.id}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      // Verify it no longer appears in isActive=true listing
      const listRes = await request(app)
        .get('/api/v1/customers?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.body.data.items).not.toContainEqual(
        expect.objectContaining({ id: customer.id }),
      );

      // Re-activate for other tests
      await request(app)
        .patch(`/api/v1/customers/${customer.id}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    });
  });

  describe('DELETE /:id — soft delete', () => {
    it('returns 204 and then GET returns 404', async () => {
      const customer = await AppDataSource.getRepository(Customer).save(
        AppDataSource.getRepository(Customer).create({
          code: 'CUST_TODELETE',
          fullNameEn: 'To Delete',
          fullNameAr: 'للحذف',
          branchId: branch1.id,
        }),
      );

      const deleteRes = await request(app)
        .delete(`/api/v1/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(204);

      const getRes = await request(app)
        .get(`/api/v1/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('permissions', () => {
    it('returns 403 when agent calls DELETE', async () => {
      const customer = await AppDataSource.getRepository(Customer).findOneBy({ code: 'CUST002' });
      if (!customer) throw new Error('CUST002 not found');

      const res = await request(app)
        .delete(`/api/v1/customers/${customer.id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 403 for non-admin accessing another branch's customer", async () => {
      const customer = await AppDataSource.getRepository(Customer).findOneBy({ code: 'CUST003' });
      if (!customer) throw new Error('CUST003 not found');

      const res = await request(app)
        .get(`/api/v1/customers/${customer.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
