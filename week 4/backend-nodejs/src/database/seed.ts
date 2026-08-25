import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { logger } from '../common/utils/logger';
import { env } from '../config/env';
import { TicketStatus } from '../modules/tickets/ticketStatus.entity';
import { TicketPriority } from '../modules/tickets/ticketPriority.entity';
import { Role } from '../modules/users/role.entity';
import { Branch } from '../modules/branches/branch.entity';
import { Department } from '../modules/departments/department.entity';
import { User } from '../modules/users/user.entity';
import { Customer } from '../modules/customers/customer.entity';

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

    const roles = [
      { code: 'ADMIN', nameEn: 'Administrator', nameAr: 'المسؤول' },
      { code: 'MANAGER', nameEn: 'Manager', nameAr: 'مدير' },
      { code: 'AGENT', nameEn: 'Support Agent', nameAr: 'وكيل الدعم' },
    ];

    for (const role of roles) {
      const existing = await AppDataSource.getRepository(Role).findOne({ where: { code: role.code } });
      if (!existing) {
        const newRole = AppDataSource.getRepository(Role).create(role);
        await AppDataSource.getRepository(Role).save(newRole);
        logger.info(`Seeded Role: ${role.code}`);
      }
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
      const dept1Existing = await AppDataSource.getRepository(Department).findOne({
        where: { code: 'SALES', branchId: branch1.id },
      });
      if (!dept1Existing) {
        const dept1 = AppDataSource.getRepository(Department).create({
          branchId: branch1.id,
          code: 'SALES',
          nameEn: 'Sales',
          nameAr: 'المبيعات',
          isActive: true,
        });
        await AppDataSource.getRepository(Department).save(dept1);
        logger.info('Seeded Department: SALES');
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
