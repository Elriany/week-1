import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { logger } from '../common/utils/logger';
import { env } from '../config/env';
import { TicketStatus } from '../modules/tickets/ticketStatus.entity';
import { TicketPriority } from '../modules/tickets/ticketPriority.entity';
import { Role } from '../modules/users/role.entity';
import { Permission } from '../modules/users/permission.entity';
import { Branch } from '../modules/branches/branch.entity';
import { Department } from '../modules/departments/department.entity';
import { User } from '../modules/users/user.entity';
import { Customer } from '../modules/customers/customer.entity';
import {
  PERMISSION_CATALOGUE,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
  type RoleCode,
} from '../modules/users/permissions.constants';
import { hashPassword } from '../modules/users/users.service';

async function seed() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connected for seeding');
    }

    // Reference data (always seeded)
    const statuses = [
      { code: 'NEW', nameEn: 'New', nameAr: 'جديد', sortOrder: 0 },
      { code: 'OPEN', nameEn: 'Open', nameAr: 'مفتوح', sortOrder: 1 },
      { code: 'PENDING', nameEn: 'Pending', nameAr: 'قيد الانتظار', sortOrder: 2 },
      { code: 'RESOLVED', nameEn: 'Resolved', nameAr: 'تم الحل', sortOrder: 3 },
      { code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق', sortOrder: 4 },
    ];

    for (const status of statuses) {
      const existing = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: status.code } });
      if (!existing) {
        const newStatus = AppDataSource.getRepository(TicketStatus).create(status);
        await AppDataSource.getRepository(TicketStatus).save(newStatus);
        logger.info(`Seeded TicketStatus: ${status.code}`);
      }
    }

    const priorities = [
      { code: 'LOW', nameEn: 'Low', nameAr: 'منخفض', sortOrder: 0 },
      { code: 'MEDIUM', nameEn: 'Medium', nameAr: 'متوسط', sortOrder: 1 },
      { code: 'HIGH', nameEn: 'High', nameAr: 'مرتفع', sortOrder: 2 },
      { code: 'URGENT', nameEn: 'Urgent', nameAr: 'عاجل', sortOrder: 3 },
    ];

    for (const priority of priorities) {
      const existing = await AppDataSource.getRepository(TicketPriority).findOne({ where: { code: priority.code } });
      if (!existing) {
        const newPriority = AppDataSource.getRepository(TicketPriority).create(priority);
        await AppDataSource.getRepository(TicketPriority).save(newPriority);
        logger.info(`Seeded TicketPriority: ${priority.code}`);
      }
    }

    // Permissions — the catalogue is the single source of truth
    for (const permission of PERMISSION_CATALOGUE) {
      const existing = await AppDataSource.getRepository(Permission).findOne({ where: { code: permission.code } });
      if (!existing) {
        await AppDataSource.getRepository(Permission).save(
          AppDataSource.getRepository(Permission).create(permission),
        );
        logger.info(`Seeded Permission: ${permission.code}`);
      }
    }

    const allPermissions = await AppDataSource.getRepository(Permission).find();
    const permissionByCode = new Map(allPermissions.map(p => [p.code, p]));

    const roles = [
      { code: ROLE_CODES.ADMIN, nameEn: 'Administrator', nameAr: 'المسؤول' },
      { code: ROLE_CODES.MANAGER, nameEn: 'Manager', nameAr: 'مدير' },
      { code: ROLE_CODES.SUPERVISOR, nameEn: 'Supervisor', nameAr: 'مشرف' },
      { code: ROLE_CODES.AGENT, nameEn: 'Support Agent', nameAr: 'وكيل الدعم' },
      { code: ROLE_CODES.CUSTOMER, nameEn: 'Customer', nameAr: 'عميل' },
    ];

    for (const role of roles) {
      let entity = await AppDataSource.getRepository(Role).findOne({
        where: { code: role.code },
        relations: { permissions: true },
      });

      if (!entity) {
        entity = AppDataSource.getRepository(Role).create(role);
        logger.info(`Seeded Role: ${role.code}`);
      }

      // Re-apply the mapping every run so a change to ROLE_PERMISSION_MAP
      // propagates without needing a fresh database.
      entity.permissions = ROLE_PERMISSION_MAP[role.code as RoleCode]
        .map(code => permissionByCode.get(code))
        .filter((p): p is Permission => Boolean(p));

      await AppDataSource.getRepository(Role).save(entity);
    }

    logger.info('Reference data seeded successfully');

    // Demo data (development only)
    if (env.NODE_ENV !== 'production') {
      // Create branches
      const branch1Existing = await AppDataSource.getRepository(Branch).findOne({ where: { code: 'HQ' } });
      let branch1 = branch1Existing;
      if (!branch1) {
        branch1 = AppDataSource.getRepository(Branch).create({
          code: 'HQ',
          nameEn: 'Headquarters',
          nameAr: 'المقر الرئيسي',
          isActive: true,
        });
        branch1 = await AppDataSource.getRepository(Branch).save(branch1);
        logger.info('Seeded Branch: HQ');
      }

      const branch2Existing = await AppDataSource.getRepository(Branch).findOne({ where: { code: 'RIYADH' } });
      let branch2 = branch2Existing;
      if (!branch2) {
        branch2 = AppDataSource.getRepository(Branch).create({
          code: 'RIYADH',
          nameEn: 'Riyadh Office',
          nameAr: 'مكتب الرياض',
          isActive: true,
        });
        branch2 = await AppDataSource.getRepository(Branch).save(branch2);
        logger.info('Seeded Branch: RIYADH');
      }

      // Create departments
      let dept1 = await AppDataSource.getRepository(Department).findOne({
        where: { code: 'SALES', branchId: branch1.id },
      });
      if (!dept1) {
        dept1 = AppDataSource.getRepository(Department).create({
          branchId: branch1.id,
          code: 'SALES',
          nameEn: 'Sales',
          nameAr: 'المبيعات',
          isActive: true,
        });
        dept1 = await AppDataSource.getRepository(Department).save(dept1);
        logger.info('Seeded Department: SALES');
      }

      // A department in the second branch, so branch scoping is demonstrable.
      let dept2 = await AppDataSource.getRepository(Department).findOne({
        where: { code: 'SUPPORT', branchId: branch2.id },
      });
      if (!dept2) {
        dept2 = AppDataSource.getRepository(Department).create({
          branchId: branch2.id,
          code: 'SUPPORT',
          nameEn: 'Support',
          nameAr: 'الدعم',
          isActive: true,
        });
        dept2 = await AppDataSource.getRepository(Department).save(dept2);
        logger.info('Seeded Department: SUPPORT');
      }

      // Demo users — one per role, all with the same development password.
      // NEVER seed these into production; the guard above keeps them out.
      // The last entry sits in the second branch so that branch scoping can be
      // observed: the HQ manager must not see it in GET /users.
      const demoPassword = 'Passw0rd!';
      const demoUsers = [
        { email: 'admin@azm.local', roleCode: ROLE_CODES.ADMIN, fullNameEn: 'System Administrator', fullNameAr: 'مسؤول النظام', branchId: branch1.id, departmentId: dept1.id },
        { email: 'manager@azm.local', roleCode: ROLE_CODES.MANAGER, fullNameEn: 'Branch Manager', fullNameAr: 'مدير الفرع', branchId: branch1.id, departmentId: dept1.id },
        { email: 'supervisor@azm.local', roleCode: ROLE_CODES.SUPERVISOR, fullNameEn: 'Team Supervisor', fullNameAr: 'مشرف الفريق', branchId: branch1.id, departmentId: dept1.id },
        { email: 'agent@azm.local', roleCode: ROLE_CODES.AGENT, fullNameEn: 'Support Agent', fullNameAr: 'وكيل الدعم', branchId: branch1.id, departmentId: dept1.id },
        { email: 'customer@azm.local', roleCode: ROLE_CODES.CUSTOMER, fullNameEn: 'Demo Customer', fullNameAr: 'عميل تجريبي', branchId: branch1.id, departmentId: dept1.id },
        { email: 'riyadh.agent@azm.local', roleCode: ROLE_CODES.AGENT, fullNameEn: 'Riyadh Agent', fullNameAr: 'وكيل الرياض', branchId: branch2.id, departmentId: dept2.id },
      ];

      for (const demo of demoUsers) {
        const existing = await AppDataSource.getRepository(User).findOne({ where: { email: demo.email } });
        if (existing) continue;

        const role = await AppDataSource.getRepository(Role).findOne({ where: { code: demo.roleCode } });
        if (!role) continue;

        await AppDataSource.getRepository(User).save(
          AppDataSource.getRepository(User).create({
            email: demo.email,
            passwordHash: await hashPassword(demoPassword),
            fullNameEn: demo.fullNameEn,
            fullNameAr: demo.fullNameAr,
            roleId: role.id,
            branchId: demo.branchId,
            departmentId: demo.departmentId,
            isActive: true,
          }),
        );
        logger.info(`Seeded User: ${demo.email}`);
      }

      // Seed customers
      const customerExisting = await AppDataSource.getRepository(Customer).findOne({
        where: { code: 'CUST001' },
      });
      if (!customerExisting) {
        const customer = AppDataSource.getRepository(Customer).create({
          branchId: branch1.id,
          code: 'CUST001',
          fullNameEn: 'John Smith',
          fullNameAr: 'جون سميث',
          email: 'john@example.com',
          phone: '+966501234567',
          preferredLanguage: 'en',
        });
        await AppDataSource.getRepository(Customer).save(customer);
        logger.info('Seeded Customer: CUST001');
      }

      logger.info('Demo data seeded successfully');
    }

    await AppDataSource.destroy();
    logger.info('Seed completed successfully');
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Seed failed', { error: err.message });
    }
    process.exit(1);
  }
}

seed();
