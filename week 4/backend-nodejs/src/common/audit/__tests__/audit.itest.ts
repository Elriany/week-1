import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { AppDataSource } from '../../../config/data-source';
import { app } from '../../../app';
import { User } from '../../../modules/users/user.entity';
import { Role } from '../../../modules/users/role.entity';
import { Branch } from '../../../modules/branches/branch.entity';
import { Customer } from '../../../modules/customers/customer.entity';
import { TicketPriority } from '../../../modules/tickets/ticketPriority.entity';
import { Department } from '../../../modules/departments/department.entity';
import { hashPassword } from '../../../modules/users/users.service';
import { ROLE_CODES } from '../../../modules/users/permissions.constants';
import { AuditLog } from '../auditLog.entity';
import { recordAudit } from '../audit.service';

describe('audit trail — integration tests', () => {
  let adminToken: string;
  let adminUserId: string;
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
    const email = 'test-admin-audit@test.local';
    let adminUser = await AppDataSource.getRepository(User).findOneBy({ email });
    if (!adminUser) {
      adminUser = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email,
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Test Admin Audit',
          fullNameAr: 'اختبار إداري',
          roleId: adminRole.id,
          branchId: branch1.id,
          departmentId: dept.id,
          isActive: true,
        }),
      );
    }
    adminUserId = adminUser.id;

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test1234' });
    adminToken = res.body.data.accessToken;
  });

  it('writes exactly one TICKET_CREATED audit row with the caller as actor', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Audit create test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });
    expect(res.status).toBe(201);
    const ticketId = res.body.data.id;

    const rows = await AppDataSource.getRepository(AuditLog).find({
      where: { entityId: ticketId, action: 'TICKET_CREATED' as any },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].actorUserId).toBe(adminUserId);
  });

  it('a status transition writes one TICKET_STATUS_CHANGED audit row and one TicketHistory row', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Audit transition test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });
    const ticketId = created.body.data.id;

    const metaRes = await request(app).get('/api/v1/tickets/meta').set('Authorization', `Bearer ${adminToken}`);
    const inProgress = metaRes.body.data.statuses.find((s: any) => s.code === 'IN_PROGRESS');

    const transitionRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: inProgress.id });
    expect(transitionRes.status).toBe(200);

    const auditRows = await AppDataSource.getRepository(AuditLog).find({
      where: { entityId: ticketId, action: 'TICKET_STATUS_CHANGED' as any },
    });
    expect(auditRows).toHaveLength(1);

    const historyRes = await request(app)
      .get(`/api/v1/tickets/${ticketId}/history`)
      .set('Authorization', `Bearer ${adminToken}`);
    const statusChanged = historyRes.body.data.items.filter((h: any) => h.action === 'STATUS_CHANGED');
    expect(statusChanged).toHaveLength(1);
  });

  it('a no-op transition writes no audit row', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Audit no-op test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });
    const ticketId = created.body.data.id;
    const currentStatusId = created.body.data.status.id;

    const beforeCount = await AppDataSource.getRepository(AuditLog).count({ where: { entityId: ticketId } });

    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: currentStatusId });
    expect(res.status).toBe(200);

    const afterCount = await AppDataSource.getRepository(AuditLog).count({ where: { entityId: ticketId } });
    expect(afterCount).toBe(beforeCount);
  });

  it('assigning a NEW ticket writes two audit rows: TICKET_ASSIGNED and TICKET_STATUS_CHANGED', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Audit assignment test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });
    const ticketId = created.body.data.id;

    const agentRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.AGENT });
    let agent = await AppDataSource.getRepository(User).findOneBy({ email: 'test-agent-audit@test.local' });
    if (!agent) {
      agent = await AppDataSource.getRepository(User).save(
        AppDataSource.getRepository(User).create({
          email: 'test-agent-audit@test.local',
          passwordHash: await hashPassword('Test1234'),
          fullNameEn: 'Test Agent Audit',
          fullNameAr: 'وكيل اختبار',
          roleId: agentRole.id,
          branchId: branch1.id,
          departmentId: dept.id,
          isActive: true,
        }),
      );
    }

    const assignRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assignee`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedUserId: agent.id });
    expect(assignRes.status).toBe(200);

    const assignedRows = await AppDataSource.getRepository(AuditLog).find({
      where: { entityId: ticketId, action: 'TICKET_ASSIGNED' as any },
    });
    const statusRows = await AppDataSource.getRepository(AuditLog).find({
      where: { entityId: ticketId, action: 'TICKET_STATUS_CHANGED' as any },
    });
    expect(assignedRows).toHaveLength(1);
    expect(statusRows).toHaveLength(1);
  });

  it('a rolled-back transaction leaves no audit row', async () => {
    const before = await AppDataSource.getRepository(AuditLog).count();

    await expect(
      AppDataSource.transaction(async manager => {
        await recordAudit(manager, {
          actorUserId: adminUserId,
          action: 'CONFIG_CREATED' as any,
          entityType: 'Branch' as any,
          summary: 'Should be rolled back',
        });
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');

    const after = await AppDataSource.getRepository(AuditLog).count();
    expect(after).toBe(before);
  });

  it('no ticket response body — the surface audit rows are read alongside — contains passwordHash', async () => {
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'No password leak test',
        description: 'Test',
        customerId: customer.id,
        departmentId: dept.id,
        priorityId: priority.id,
        branchId: branch1.id,
      });
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');
  });
});
