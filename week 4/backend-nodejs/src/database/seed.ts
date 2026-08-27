import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { logger } from '../common/utils/logger';
import { env } from '../config/env';
import { TicketStatus } from '../modules/tickets/ticketStatus.entity';
import { TicketPriority } from '../modules/tickets/ticketPriority.entity';
import { TicketCategory } from '../modules/tickets/ticketCategory.entity';
import { Role } from '../modules/users/role.entity';
import { Permission } from '../modules/users/permission.entity';
import { Branch } from '../modules/branches/branch.entity';
import { Department } from '../modules/departments/department.entity';
import { User } from '../modules/users/user.entity';
import { Customer } from '../modules/customers/customer.entity';
import { CustomerContact } from '../modules/customers/customerContact.entity';
import { CustomerNote } from '../modules/customers/customerNote.entity';
import { Ticket } from '../modules/tickets/ticket.entity';
import { TicketComment } from '../modules/tickets/ticketComment.entity';
import {
  PERMISSION_CATALOGUE,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
  type RoleCode,
} from '../modules/users/permissions.constants';
import {
  TICKET_STATUS_CATALOGUE,
  TICKET_CATEGORY_CATALOGUE,
} from '../modules/tickets/ticket.constants';
import { hashPassword } from '../modules/users/users.service';
import { transitionTicket, assignTicket } from '../modules/tickets/tickets.service';

async function seed() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connected for seeding');
    }

    // Reference data (always seeded)
    for (const status of TICKET_STATUS_CATALOGUE) {
      const existing = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: status.code } });
      if (!existing) {
        const newStatus = AppDataSource.getRepository(TicketStatus).create(status);
        await AppDataSource.getRepository(TicketStatus).save(newStatus);
        logger.info(`Seeded TicketStatus: ${status.code}`);
      }
    }

    for (const category of TICKET_CATEGORY_CATALOGUE) {
      const existing = await AppDataSource.getRepository(TicketCategory).findOne({ where: { code: category.code } });
      if (!existing) {
        const newCategory = AppDataSource.getRepository(TicketCategory).create(category);
        await AppDataSource.getRepository(TicketCategory).save(newCategory);
        logger.info(`Seeded TicketCategory: ${category.code}`);
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

      // Seed customers — varied set to exercise search and pagination
      const demoCustomers = [
        { code: 'CUST001', fullNameEn: 'John Smith', fullNameAr: 'جون سميث', email: 'john@example.com', phone: '+966501234567', branchId: branch1.id, isActive: true },
        { code: 'CUST002', fullNameEn: 'Alice Johnson', fullNameAr: 'أليس جونسون', email: 'alice@example.com', phone: '+966502345678', branchId: branch1.id, isActive: true },
        { code: 'CUST003', fullNameEn: 'Bob Williams', fullNameAr: 'محمد علي', email: null, phone: '+966503456789', branchId: branch1.id, isActive: true },
        { code: 'CUST004', fullNameEn: 'Carol Davis', fullNameAr: 'كارول ديفيس', email: 'carol@example.com', phone: null, branchId: branch1.id, isActive: true },
        { code: 'CUST005', fullNameEn: 'David Miller', fullNameAr: 'داود ميلر', email: 'david@example.com', phone: '+966504567890', branchId: branch1.id, isActive: false },
        { code: 'CUST006', fullNameEn: 'Eve Brown', fullNameAr: 'إيف براون', email: 'eve@example.com', phone: '+966505678901', branchId: branch2.id, isActive: true },
        { code: 'CUST007', fullNameEn: 'Frank Green', fullNameAr: 'فرانك أخضر', email: 'frank@example.com', phone: '+966506789012', branchId: branch2.id, isActive: true },
        { code: 'CUST008', fullNameEn: 'Grace Lee', fullNameAr: 'غريس لي', email: 'grace@example.com', phone: '+966507890123', branchId: branch1.id, isActive: true },
      ];

      const savedCustomers = new Map<string, Customer>();

      for (const customerData of demoCustomers) {
        let customer = await AppDataSource.getRepository(Customer).findOne({
          where: { code: customerData.code },
        });
        if (!customer) {
          customer = AppDataSource.getRepository(Customer).create(customerData);
          customer = await AppDataSource.getRepository(Customer).save(customer);
          logger.info(`Seeded Customer: ${customerData.code}`);
        }
        savedCustomers.set(customerData.code, customer);
      }

      // Seed contacts and notes for the first two customers
      const cust001 = savedCustomers.get('CUST001');
      const cust002 = savedCustomers.get('CUST002');
      const cust003 = savedCustomers.get('CUST003');
      const adminUserObj = await AppDataSource.getRepository(User).findOne({ where: { email: 'admin@azm.local' } });

      if (cust001 && adminUserObj) {
        // Contacts for CUST001
        const contact1 = await AppDataSource.getRepository(CustomerContact).findOne({
          where: { customerId: cust001.id, fullNameEn: 'Jane Smith' },
        });
        if (!contact1) {
          await AppDataSource.getRepository(CustomerContact).save(
            AppDataSource.getRepository(CustomerContact).create({
              customerId: cust001.id,
              fullNameEn: 'Jane Smith',
              fullNameAr: 'جين سميث',
              jobTitle: 'Finance Manager',
              email: 'jane.smith@example.com',
              phone: '+966509876543',
              isPrimary: true,
            }),
          );
          logger.info('Seeded Contact: Jane Smith (CUST001, primary)');
        }

        const contact2 = await AppDataSource.getRepository(CustomerContact).findOne({
          where: { customerId: cust001.id, fullNameEn: 'Robert Smith' },
        });
        if (!contact2) {
          await AppDataSource.getRepository(CustomerContact).save(
            AppDataSource.getRepository(CustomerContact).create({
              customerId: cust001.id,
              fullNameEn: 'Robert Smith',
              fullNameAr: 'روبرت سميث',
              jobTitle: null,
              email: null,
              phone: '+966505555555',
              isPrimary: false,
            }),
          );
          logger.info('Seeded Contact: Robert Smith (CUST001, secondary)');
        }

        // Notes for CUST001
        const note1 = await AppDataSource.getRepository(CustomerNote).findOne({
          where: { customerId: cust001.id, body: 'Initial contact established' },
        });
        if (!note1) {
          await AppDataSource.getRepository(CustomerNote).save(
            AppDataSource.getRepository(CustomerNote).create({
              customerId: cust001.id,
              authorUserId: adminUserObj.id,
              body: 'Initial contact established. Customer interested in premium services.',
            }),
          );
          logger.info('Seeded Note: CUST001 note 1');
        }

        const note2 = await AppDataSource.getRepository(CustomerNote).findOne({
          where: { customerId: cust001.id, body: 'Follow-up call scheduled' },
        });
        if (!note2) {
          await AppDataSource.getRepository(CustomerNote).save(
            AppDataSource.getRepository(CustomerNote).create({
              customerId: cust001.id,
              authorUserId: adminUserObj.id,
              body: 'Follow-up call scheduled for next week.',
            }),
          );
          logger.info('Seeded Note: CUST001 note 2');
        }
      }

      if (cust002 && adminUserObj) {
        // Contacts for CUST002
        const contact1 = await AppDataSource.getRepository(CustomerContact).findOne({
          where: { customerId: cust002.id, fullNameEn: 'Alice Johnson' },
        });
        if (!contact1) {
          await AppDataSource.getRepository(CustomerContact).save(
            AppDataSource.getRepository(CustomerContact).create({
              customerId: cust002.id,
              fullNameEn: 'Alice Johnson',
              fullNameAr: 'أليس جونسون',
              jobTitle: 'Operations Lead',
              email: 'alice.johnson@example.com',
              phone: null,
              isPrimary: true,
            }),
          );
          logger.info('Seeded Contact: Alice Johnson (CUST002, primary)');
        }

        const contact2 = await AppDataSource.getRepository(CustomerContact).findOne({
          where: { customerId: cust002.id, fullNameEn: 'Bob Johnson' },
        });
        if (!contact2) {
          await AppDataSource.getRepository(CustomerContact).save(
            AppDataSource.getRepository(CustomerContact).create({
              customerId: cust002.id,
              fullNameEn: 'Bob Johnson',
              fullNameAr: 'بوب جونسون',
              jobTitle: 'IT Director',
              email: 'bob.johnson@example.com',
              phone: '+966508888888',
              isPrimary: false,
            }),
          );
          logger.info('Seeded Contact: Bob Johnson (CUST002, secondary)');
        }

        // Notes for CUST002
        const note1 = await AppDataSource.getRepository(CustomerNote).findOne({
          where: { customerId: cust002.id, body: 'Major account with high transaction volume' },
        });
        if (!note1) {
          await AppDataSource.getRepository(CustomerNote).save(
            AppDataSource.getRepository(CustomerNote).create({
              customerId: cust002.id,
              authorUserId: adminUserObj.id,
              body: 'Major account with high transaction volume. Special pricing negotiated.',
            }),
          );
          logger.info('Seeded Note: CUST002 note 1');
        }

        const note2 = await AppDataSource.getRepository(CustomerNote).findOne({
          where: { customerId: cust002.id, body: 'Monthly review meeting completed' },
        });
        if (!note2) {
          await AppDataSource.getRepository(CustomerNote).save(
            AppDataSource.getRepository(CustomerNote).create({
              customerId: cust002.id,
              authorUserId: adminUserObj.id,
              body: 'Monthly review meeting completed. All KPIs on track.',
            }),
          );
          logger.info('Seeded Note: CUST002 note 2');
        }
      }

      // Seed demo tickets and walk through lifecycle
      const newStatus = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: 'NEW' } });
      const inProgressStatus = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: 'IN_PROGRESS' } });
      const pendingCustomerStatus = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: 'PENDING_CUSTOMER' } });
      const resolvedStatus = await AppDataSource.getRepository(TicketStatus).findOne({ where: { code: 'RESOLVED' } });
      const highPriority = await AppDataSource.getRepository(TicketPriority).findOne({ where: { code: 'HIGH' } });
      const lowPriority = await AppDataSource.getRepository(TicketPriority).findOne({ where: { code: 'LOW' } });
      const technicalCategory = await AppDataSource.getRepository(TicketCategory).findOne({ where: { code: 'TECHNICAL' } });
      const billingCategory = await AppDataSource.getRepository(TicketCategory).findOne({ where: { code: 'BILLING' } });
      const agentUser = await AppDataSource.getRepository(User).findOne({ where: { email: 'agent@azm.local' } });

      if (newStatus && highPriority && technicalCategory && cust001 && cust002 && cust003 && lowPriority && billingCategory) {
        const tickets = [
          {
            ticketNumber: 'TKT-2026-00001',
            branchId: branch1.id,
            departmentId: dept1.id,
            customerId: cust001.id,
            assignedUserId: null,
            statusId: newStatus.id,
            priorityId: highPriority.id,
            categoryId: technicalCategory.id,
            subject: 'API Integration Issue',
            description: 'Customer reports authentication failures when integrating with our API endpoint.',
          },
          {
            ticketNumber: 'TKT-2026-00002',
            branchId: branch1.id,
            departmentId: dept1.id,
            customerId: cust002.id,
            assignedUserId: null,
            statusId: newStatus.id,
            priorityId: lowPriority.id,
            categoryId: billingCategory.id,
            subject: 'Invoice Discrepancy',
            description: 'Previous month invoice shows incorrect item count on line 5.',
          },
          {
            ticketNumber: 'TKT-2026-00003',
            branchId: branch1.id,
            departmentId: dept1.id,
            customerId: cust001.id,
            assignedUserId: null,
            statusId: newStatus.id,
            priorityId: highPriority.id,
            categoryId: technicalCategory.id,
            subject: 'Database Connection Timeout',
            description: 'Experiencing intermittent database connection timeouts during peak hours.',
          },
          {
            ticketNumber: 'TKT-2026-00004',
            branchId: branch2.id,
            departmentId: dept2.id,
            customerId: cust003.id,
            assignedUserId: null,
            statusId: newStatus.id,
            priorityId: lowPriority.id,
            categoryId: technicalCategory.id,
            subject: 'Documentation Request',
            description: 'Need updated API documentation for v3.0 endpoints.',
          },
          {
            ticketNumber: 'TKT-2026-00005',
            branchId: branch1.id,
            departmentId: dept1.id,
            customerId: cust002.id,
            assignedUserId: null,
            statusId: resolvedStatus?.id || newStatus.id,
            priorityId: highPriority.id,
            categoryId: technicalCategory.id,
            subject: 'Performance Optimization',
            description: 'Report slow query performance on the customer dashboard.',
          },
          {
            ticketNumber: 'TKT-2026-00006',
            branchId: branch1.id,
            departmentId: dept1.id,
            customerId: cust001.id,
            assignedUserId: null,
            statusId: newStatus.id,
            priorityId: lowPriority.id,
            categoryId: technicalCategory.id,
            subject: 'Feature Request: Export to Excel',
            description: 'Customers asking for ability to export reports to Excel format.',
          },
        ];

        for (const ticket of tickets) {
          const existing = await AppDataSource.getRepository(Ticket).findOne({
            where: { ticketNumber: ticket.ticketNumber },
          });
          if (!existing) {
            await AppDataSource.getRepository(Ticket).save(
              AppDataSource.getRepository(Ticket).create(ticket),
            );
            logger.info(`Seeded Ticket: ${ticket.ticketNumber}`);
          }
        }

        // Demonstrate ticket lifecycle with service functions
        // Ticket 1: Assign then transition to IN_PROGRESS then PENDING_CUSTOMER
        if (agentUser && adminUserObj) {
          const ticket1 = await AppDataSource.getRepository(Ticket).findOne({
            where: { ticketNumber: 'TKT-2026-00001' },
          });

          if (ticket1) {
            try {
              // Assign to agent (auto-promotes NEW → ASSIGNED)
              await assignTicket(ticket1.id, agentUser.id, adminUserObj.id, branch1.id, 'Assigning to support team');
              logger.info('Ticket TKT-2026-00001: Assigned to agent (auto-promoted to ASSIGNED)');

              // Transition to IN_PROGRESS
              if (inProgressStatus) {
                await transitionTicket(ticket1.id, inProgressStatus.id, adminUserObj.id, branch1.id, 'Investigating issue');
                logger.info('Ticket TKT-2026-00001: Transitioned to IN_PROGRESS');
              }

              // Transition to PENDING_CUSTOMER
              if (pendingCustomerStatus) {
                await transitionTicket(ticket1.id, pendingCustomerStatus.id, adminUserObj.id, branch1.id, 'Waiting for customer response');
                logger.info('Ticket TKT-2026-00001: Transitioned to PENDING_CUSTOMER');
              }

              // Add internal and public notes to ticket 1
              const internalNote = await AppDataSource.getRepository(TicketComment).findOne({
                where: { ticketId: ticket1.id, body: 'Customer reports authentication failures. Investigating OAuth integration.' },
              });
              if (!internalNote) {
                await AppDataSource.getRepository(TicketComment).save(
                  AppDataSource.getRepository(TicketComment).create({
                    ticketId: ticket1.id,
                    authorUserId: adminUserObj.id,
                    body: 'Customer reports authentication failures. Investigating OAuth integration.',
                    isInternal: true,
                  }),
                );
                logger.info('Seeded internal note for Ticket TKT-2026-00001');
              }

              const publicNote = await AppDataSource.getRepository(TicketComment).findOne({
                where: { ticketId: ticket1.id, body: 'We are investigating the authentication issue and will update you soon.' },
              });
              if (!publicNote) {
                await AppDataSource.getRepository(TicketComment).save(
                  AppDataSource.getRepository(TicketComment).create({
                    ticketId: ticket1.id,
                    authorUserId: adminUserObj.id,
                    body: 'We are investigating the authentication issue and will update you soon.',
                    isInternal: false,
                  }),
                );
                logger.info('Seeded public note for Ticket TKT-2026-00001');
              }
            } catch (err) {
              if (err instanceof Error) {
                logger.warn(`Ticket TKT-2026-00001 lifecycle demo: ${err.message}`);
              }
            }
          }

          // Ticket 3: Assign then transition to IN_PROGRESS then RESOLVED
          const ticket3 = await AppDataSource.getRepository(Ticket).findOne({
            where: { ticketNumber: 'TKT-2026-00003' },
          });

          if (ticket3) {
            try {
              // Assign to agent (auto-promotes NEW → ASSIGNED)
              await assignTicket(ticket3.id, agentUser.id, adminUserObj.id, branch1.id, 'Assigned for investigation');
              logger.info('Ticket TKT-2026-00003: Assigned to agent (auto-promoted to ASSIGNED)');

              // Transition to IN_PROGRESS
              if (inProgressStatus) {
                await transitionTicket(ticket3.id, inProgressStatus.id, adminUserObj.id, branch1.id, 'Working on fix');
                logger.info('Ticket TKT-2026-00003: Transitioned to IN_PROGRESS');
              }

              // Transition to RESOLVED
              if (resolvedStatus) {
                await transitionTicket(ticket3.id, resolvedStatus.id, adminUserObj.id, branch1.id, 'Applied database connection pooling');
                logger.info('Ticket TKT-2026-00003: Transitioned to RESOLVED');
              }
            } catch (err) {
              if (err instanceof Error) {
                logger.warn(`Ticket TKT-2026-00003 lifecycle demo: ${err.message}`);
              }
            }
          }
        }
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
