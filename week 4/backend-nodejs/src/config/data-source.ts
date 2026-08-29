import { DataSource } from 'typeorm';
import * as msnodesqlv8 from 'mssql/msnodesqlv8';
import { env } from './env';
// Entities are imported explicitly rather than globbed. TypeORM resolves a glob
// with its own `require()`, which bypasses the test runner's TypeScript
// transform — under Vitest that threw `SyntaxError: Invalid or unexpected
// token` on the first `.entity.ts` and took the whole integration suite with
// it. Explicit imports go through the normal module graph in every runtime.
import { AuditLog } from '../common/audit/auditLog.entity';
import { Branch } from '../modules/branches/branch.entity';
import { Customer } from '../modules/customers/customer.entity';
import { CustomerAttachment } from '../modules/customers/customerAttachment.entity';
import { CustomerContact } from '../modules/customers/customerContact.entity';
import { CustomerNote } from '../modules/customers/customerNote.entity';
import { Department } from '../modules/departments/department.entity';
import { KbArticle } from '../modules/kb/kbArticle.entity';
import { KbCategory } from '../modules/kb/kbCategory.entity';
import { SlaPolicy } from '../modules/sla/slaPolicy.entity';
import { Ticket } from '../modules/tickets/ticket.entity';
import { TicketAttachment } from '../modules/tickets/ticketAttachment.entity';
import { TicketCategory } from '../modules/tickets/ticketCategory.entity';
import { TicketComment } from '../modules/tickets/ticketComment.entity';
import { TicketHistory } from '../modules/tickets/ticketHistory.entity';
import { TicketPriority } from '../modules/tickets/ticketPriority.entity';
import { TicketStatus } from '../modules/tickets/ticketStatus.entity';
import { Permission } from '../modules/users/permission.entity';
import { Role } from '../modules/users/role.entity';
import { User } from '../modules/users/user.entity';
// Migrations, likewise explicit — the same glob require() breaks them under Vitest.
import { InitialCrmSchema1724086800000 } from '../database/migrations/1724086800000-InitialCrmSchema';
import { AuthPermissions1756000000000 } from '../database/migrations/1756000000000-AuthPermissions';
import { CustomerManagement1757000000000 } from '../database/migrations/1757000000000-CustomerManagement';
import { CustomerContactsAndNotes1758000000000 } from '../database/migrations/1758000000000-CustomerContactsAndNotes';
import { CustomerAttachments1759000000000 } from '../database/migrations/1759000000000-CustomerAttachments';
import { TicketManagement1760000000000 } from '../database/migrations/1760000000000-TicketManagement';
import { TicketHistory1761000000000 } from '../database/migrations/1761000000000-TicketHistory';
import { TicketAttachments1762000000000 } from '../database/migrations/1762000000000-TicketAttachments';
import { CrmFoundation1763000000000 } from '../database/migrations/1763000000000-CrmFoundation';
import { SlaPolicies1764000000000 } from '../database/migrations/1764000000000-SlaPolicies';
import { KnowledgeBase1765000000000 } from '../database/migrations/1765000000000-KnowledgeBase';
import { ReportingIndexes1766000000000 } from '../database/migrations/1766000000000-ReportingIndexes';
import { Administration1767000000000 } from '../database/migrations/1767000000000-Administration';

const connectionString = [
  `Driver={${env.DB_ODBC_DRIVER}}`,
  `Server=${env.DB_SERVER}`,
  `Database=${env.DB_DATABASE}`,
  'Trusted_Connection=yes',
  `TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no'}`,
].join(';') + ';';

export const AppDataSource = new DataSource({
  type: 'mssql',
  driver: msnodesqlv8,          // TOP LEVEL — inside `extra` it is ignored
  database: env.DB_DATABASE,
  synchronize: false,           // NEVER true — migrations are the only schema path
  logging: env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  entities: [
    AuditLog,
    Branch,
    Customer,
    CustomerAttachment,
    CustomerContact,
    CustomerNote,
    Department,
    KbArticle,
    KbCategory,
    SlaPolicy,
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketComment,
    TicketHistory,
    TicketPriority,
    TicketStatus,
    Permission,
    Role,
    User,
  ],
  migrations: [
    InitialCrmSchema1724086800000,
    AuthPermissions1756000000000,
    CustomerManagement1757000000000,
    CustomerContactsAndNotes1758000000000,
    CustomerAttachments1759000000000,
    TicketManagement1760000000000,
    TicketHistory1761000000000,
    TicketAttachments1762000000000,
    CrmFoundation1763000000000,
    SlaPolicies1764000000000,
    KnowledgeBase1765000000000,
    ReportingIndexes1766000000000,
    Administration1767000000000,
  ],
  migrationsTableName: '__migrations',
  extra: { connectionString },
});
