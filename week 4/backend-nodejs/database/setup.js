/**
 * Database Setup Script — npm run db:setup
 *
 * Connects to local SQL Server using Windows Authentication via sqlcmd.
 * Creates ApprovalWorkflowSystem database, runs migrations, seeds demo data.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');

const DB_SERVER = process.env.DB_SERVER && process.env.DB_SERVER !== 'localhost' ? process.env.DB_SERVER : '.';
const DB_NAME = process.env.DB_DATABASE || 'ApprovalWorkflowSystem';

function log(msg) { console.log(`[db:setup] ${msg}`); }
function logError(msg) { console.error(`[db:setup] ERROR: ${msg}`); }

function runSql(sqlStr, db = 'master') {
  // Write sql to temp file to handle multi-line SQL safely
  const tempFile = path.join(__dirname, `_temp_${Date.now()}.sql`);
  fs.writeFileSync(tempFile, sqlStr, 'utf-8');
  try {
    const cmd = `sqlcmd -S "${DB_SERVER}" -d "${db}" -i "${tempFile}" -b`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    return out;
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

function runSqlFile(filePath, db = DB_NAME) {
  const cmd = `sqlcmd -S "${DB_SERVER}" -d "${db}" -i "${filePath}" -b`;
  return execSync(cmd, { encoding: 'utf-8' });
}

function queryJson(sqlStr, db = DB_NAME) {
  const jsonSql = `${sqlStr} FOR JSON PATH`;
  const raw = runSql(jsonSql, db);
  const jsonText = raw.split('\n').filter(line => !line.startsWith('-') && !line.includes('rows affected') && line.trim()).join('');
  if (!jsonText.trim()) return [];
  try {
    return JSON.parse(jsonText);
  } catch {
    return [];
  }
}

async function main() {
  try {
    log('Starting database setup via Windows Authentication...');
    log(`Server: ${DB_SERVER}`);
    log(`Database: ${DB_NAME}`);
    log('');

    // Step 1: Ensure Database Exists
    log(`Connecting to SQL Server [${DB_SERVER}] master database...`);
    const checkDb = runSql(`IF DB_ID('${DB_NAME}') IS NULL PRINT 'CREATE' ELSE PRINT 'EXISTS'`, 'master');
    if (checkDb.includes('CREATE')) {
      log(`Database [${DB_NAME}] does not exist — creating...`);
      runSql(`CREATE DATABASE [${DB_NAME}]`, 'master');
      log(`Database [${DB_NAME}] created successfully.`);
    } else {
      log(`Database [${DB_NAME}] already exists — skipping creation.`);
    }

    // Step 2: Run Migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    log(`Found ${files.length} migration files.`);
    for (const file of files) {
      log(`  Running: ${file}`);
      runSqlFile(path.join(migrationsDir, file), DB_NAME);
    }
    log('Migrations complete.');

    // Step 3: Seed Data (Idempotent)
    const checkRoles = runSql(`SELECT COUNT(*) FROM Roles`, DB_NAME);
    if (checkRoles.includes('0')) {
      log('Seeding demo data...');
      const passwordHash = bcrypt.hashSync('Password123!', 10);

      // Seed Roles
      runSql(`INSERT INTO Roles (name) VALUES ('ADMIN'), ('MANAGER'), ('EMPLOYEE');`, DB_NAME);
      log('  Seeded roles.');

      // Seed Departments
      runSql(`
        INSERT INTO Departments (code, name, description, isActive)
        VALUES
          ('IT',  'Information Technology', 'IT infrastructure, development, and support', 1),
          ('FIN', 'Finance',               'Financial planning, accounting, and budgeting', 1),
          ('HR',  'Human Resources',       'Talent acquisition, employee relations, and HR operations', 1),
          ('OPS', 'Operations',            'Business operations and logistics management', 1);
      `, DB_NAME);
      log('  Seeded departments.');

      // Seed Users
      runSql(`
        DECLARE @adminRoleId INT = (SELECT id FROM Roles WHERE name = 'ADMIN');
        DECLARE @mgrRoleId INT = (SELECT id FROM Roles WHERE name = 'MANAGER');
        DECLARE @empRoleId INT = (SELECT id FROM Roles WHERE name = 'EMPLOYEE');

        DECLARE @itId INT = (SELECT id FROM Departments WHERE code = 'IT');
        DECLARE @finId INT = (SELECT id FROM Departments WHERE code = 'FIN');
        DECLARE @hrId INT = (SELECT id FROM Departments WHERE code = 'HR');
        DECLARE @opsId INT = (SELECT id FROM Departments WHERE code = 'OPS');

        INSERT INTO Users (employeeNumber, firstName, lastName, email, passwordHash, departmentId, roleId, status)
        VALUES
          ('EMP-001', 'Ahmed',   'Mahmoud',   'admin@approval.local',            '${passwordHash}', NULL,   @adminRoleId, 'ACTIVE'),
          ('EMP-002', 'Karim',   'Hassan',    'manager.it@approval.local',       '${passwordHash}', @itId,  @mgrRoleId,   'ACTIVE'),
          ('EMP-003', 'Sara',    'Ahmed',     'manager.finance@approval.local',  '${passwordHash}', @finId, @mgrRoleId,   'ACTIVE'),
          ('EMP-004', 'Nour',    'Ibrahim',   'manager.hr@approval.local',       '${passwordHash}', @hrId,  @mgrRoleId,   'ACTIVE'),
          ('EMP-005', 'Omar',    'Khalil',    'manager.ops@approval.local',      '${passwordHash}', @opsId, @mgrRoleId,   'ACTIVE'),
          ('EMP-006', 'Youssef', 'Ali',       'employee.it1@approval.local',     '${passwordHash}', @itId,  @empRoleId,   'ACTIVE'),
          ('EMP-007', 'Layla',   'Mohamed',   'employee.it2@approval.local',     '${passwordHash}', @itId,  @empRoleId,   'ACTIVE'),
          ('EMP-008', 'Mona',    'Samir',     'employee.finance1@approval.local','${passwordHash}', @finId, @empRoleId,   'ACTIVE'),
          ('EMP-009', 'Hassan',  'Yousry',    'employee.hr1@approval.local',     '${passwordHash}', @hrId,  @empRoleId,   'ACTIVE'),
          ('EMP-010', 'Tamer',   'Farouk',    'employee.it3@approval.local',     '${passwordHash}', @itId,  @empRoleId,   'PENDING_ACTIVATION'),
          ('EMP-011', 'Dina',    'Nasser',    'employee.finance2@approval.local','${passwordHash}', @finId, @empRoleId,   'INACTIVE');

        UPDATE Departments SET managerId = (SELECT id FROM Users WHERE email = 'manager.it@approval.local')      WHERE code = 'IT';
        UPDATE Departments SET managerId = (SELECT id FROM Users WHERE email = 'manager.finance@approval.local') WHERE code = 'FIN';
        UPDATE Departments SET managerId = (SELECT id FROM Users WHERE email = 'manager.hr@approval.local')      WHERE code = 'HR';
        UPDATE Departments SET managerId = (SELECT id FROM Users WHERE email = 'manager.ops@approval.local')     WHERE code = 'OPS';
      `, DB_NAME);
      log('  Seeded users and assigned managers.');

      // Seed Approval Requests
      runSql(`
        DECLARE @it1Id INT = (SELECT id FROM Users WHERE email = 'employee.it1@approval.local');
        DECLARE @it2Id INT = (SELECT id FROM Users WHERE email = 'employee.it2@approval.local');
        DECLARE @it3Id INT = (SELECT id FROM Users WHERE email = 'employee.it3@approval.local');
        DECLARE @fin1Id INT = (SELECT id FROM Users WHERE email = 'employee.finance1@approval.local');
        DECLARE @fin2Id INT = (SELECT id FROM Users WHERE email = 'employee.finance2@approval.local');
        DECLARE @hr1Id INT = (SELECT id FROM Users WHERE email = 'employee.hr1@approval.local');

        DECLARE @itMgrId INT = (SELECT id FROM Users WHERE email = 'manager.it@approval.local');
        DECLARE @finMgrId INT = (SELECT id FROM Users WHERE email = 'manager.finance@approval.local');
        DECLARE @hrMgrId INT = (SELECT id FROM Users WHERE email = 'manager.hr@approval.local');
        DECLARE @adminId INT = (SELECT id FROM Users WHERE email = 'admin@approval.local');

        INSERT INTO ApprovalRequests (requestNumber, title, description, type, priority, status, requesterId, reviewerId, targetEmployeeId, attempt, createdAt, updatedAt)
        VALUES
          ('APR-2026-000001', 'Request New Laptop',           'Current laptop is 4 years old. Need upgrade.', 'GENERAL_APPROVAL', 'HIGH',   'APPROVED',        @it1Id,   @itMgrId, NULL,    1, DATEADD(day, -14, GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000002', 'Software License - Adobe CC',  'Need Adobe Creative Cloud for UI mockups.',   'GENERAL_APPROVAL', 'MEDIUM', 'REJECTED',        @it1Id,   @itMgrId, NULL,    1, DATEADD(day, -10, GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000003', 'Office Supplies Request',      'Request for ergonomic keyboard and stand.',   'GENERAL_APPROVAL', 'LOW',    'PENDING_MANAGER', @it2Id,   NULL,     NULL,    1, DATEADD(day, -3,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000004', 'Budget Increase Q3',           'Cloud infrastructure expansion budget.',       'MANAGER_REQUEST',  'HIGH',   'APPROVED',        @itMgrId, @adminId, NULL,    1, DATEADD(day, -20, GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000005', 'New Server Equipment',         'Purchase 2 rack servers for dev environment.', 'MANAGER_REQUEST',  'URGENT', 'PENDING_ADMIN',   @itMgrId, NULL,     NULL,    1, DATEADD(day, -2,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000006', 'Office Renovation Budget',     'Finance department renovation budget.',       'MANAGER_REQUEST',  'MEDIUM', 'REJECTED',        @finMgrId,@adminId, NULL,    1, DATEADD(day, -7,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000007', 'Accounting Software Upgrade',  'Upgrade accounting software to latest version.','GENERAL_APPROVAL', 'MEDIUM', 'APPROVED',        @fin1Id,  @finMgrId,NULL,    1, DATEADD(day, -12, GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000008', 'Team Building Event',          'Quarterly HR department event.',               'GENERAL_APPROVAL', 'LOW',    'PENDING_MANAGER', @hr1Id,   NULL,     NULL,    1, DATEADD(day, -1,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000009', 'Employee Activation - Tamer',  'New hire activation for IT department.',       'EMPLOYEE_ACTIVATION', 'HIGH', 'PENDING_ADMIN',  @itMgrId, NULL,     @it3Id,  1, DATEADD(day, -1,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000010', 'Software License - Adobe CC (Resubmitted)', 'Updated request for Project Alpha.', 'GENERAL_APPROVAL', 'MEDIUM', 'PENDING_MANAGER', @it1Id, NULL,  NULL,    2, DATEADD(day, -5,  GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000011', 'Recruitment Platform Subscription', 'LinkedIn Recruiter annual subscription.', 'MANAGER_REQUEST',  'HIGH',   'APPROVED',        @hrMgrId, @adminId, NULL,    1, DATEADD(day, -15, GETUTCDATE()), GETUTCDATE()),
          ('APR-2026-000012', 'Employee Deactivation - Dina', 'Employee resignation processing.',            'EMPLOYEE_DEACTIVATION', 'MEDIUM', 'REJECTED', @finMgrId, @adminId, @fin2Id,  1, DATEADD(day, -5,  GETUTCDATE()), GETUTCDATE());
      `, DB_NAME);
      log('  Seeded approval requests.');

      // Seed Comments & History
      runSql(`
        DECLARE @r1 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000001');
        DECLARE @r2 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000002');
        DECLARE @r4 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000004');
        DECLARE @r6 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000006');
        DECLARE @r7 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000007');
        DECLARE @r10 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000010');
        DECLARE @r12 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000012');

        DECLARE @it1Id INT = (SELECT id FROM Users WHERE email = 'employee.it1@approval.local');
        DECLARE @fin1Id INT = (SELECT id FROM Users WHERE email = 'employee.finance1@approval.local');
        DECLARE @itMgrId INT = (SELECT id FROM Users WHERE email = 'manager.it@approval.local');
        DECLARE @finMgrId INT = (SELECT id FROM Users WHERE email = 'manager.finance@approval.local');
        DECLARE @adminId INT = (SELECT id FROM Users WHERE email = 'admin@approval.local');

        INSERT INTO ApprovalComments (requestId, authorId, comment)
        VALUES
          (@r1,  @itMgrId,  'Approved. Please coordinate with IT procurement.'),
          (@r2,  @itMgrId,  'Please provide a detailed business justification for the Adobe CC license.'),
          (@r2,  @it1Id,    'I need it for creating UI mockups for client projects.'),
          (@r2,  @itMgrId,  'Rejected — the current tools should suffice. Please resubmit with client project details.'),
          (@r4,  @adminId,  'Budget increase approved for Q3. Please submit detailed breakdown.'),
          (@r6,  @adminId,  'Office renovation request rejected — budget constraints this quarter.'),
          (@r7,  @finMgrId, 'Software upgrade approved. Coordinate with IT for installation.'),
          (@r10, @it1Id,    'Resubmitting with business justification: Required for client-facing design deliverables on Project Alpha.'),
          (@r12, @adminId,  'Deactivation rejected — pending exit interview completion.');

        INSERT INTO ApprovalHistory (requestId, action, fromStatus, toStatus, performedBy, comment)
        VALUES
          (@r1,  'REQUEST_CREATED', NULL, 'DRAFT', @it1Id, NULL),
          (@r1,  'SUBMITTED', 'DRAFT', 'PENDING_MANAGER', @it1Id, NULL),
          (@r1,  'APPROVED', 'PENDING_MANAGER', 'APPROVED', @itMgrId, 'Approved.'),
          (@r2,  'REQUEST_CREATED', NULL, 'DRAFT', @it1Id, NULL),
          (@r2,  'SUBMITTED', 'DRAFT', 'PENDING_MANAGER', @it1Id, NULL),
          (@r2,  'REJECTED', 'PENDING_MANAGER', 'REJECTED', @itMgrId, 'Rejected — please resubmit with client project details.'),
          (@r4,  'SUBMITTED', 'DRAFT', 'PENDING_ADMIN', @itMgrId, NULL),
          (@r4,  'APPROVED', 'PENDING_ADMIN', 'APPROVED', @adminId, 'Budget increase approved for Q3.'),
          (@r6,  'SUBMITTED', 'DRAFT', 'PENDING_ADMIN', @finMgrId, NULL),
          (@r6,  'REJECTED', 'PENDING_ADMIN', 'REJECTED', @adminId, 'Budget constraints this quarter.'),
          (@r10, 'RESUBMITTED', 'REJECTED', 'PENDING_MANAGER', @it1Id, 'Resubmitting with detailed business justification.');
      `, DB_NAME);
      log('  Seeded comments and history.');

      // Seed Status Requests
      runSql(`
        DECLARE @r9 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000009');
        DECLARE @r12 INT = (SELECT id FROM ApprovalRequests WHERE requestNumber = 'APR-2026-000012');
        DECLARE @it3Id INT = (SELECT id FROM Users WHERE email = 'employee.it3@approval.local');
        DECLARE @fin2Id INT = (SELECT id FROM Users WHERE email = 'employee.finance2@approval.local');
        DECLARE @itMgrId INT = (SELECT id FROM Users WHERE email = 'manager.it@approval.local');
        DECLARE @finMgrId INT = (SELECT id FROM Users WHERE email = 'manager.finance@approval.local');
        DECLARE @itDeptId INT = (SELECT id FROM Departments WHERE code = 'IT');
        DECLARE @finDeptId INT = (SELECT id FROM Departments WHERE code = 'FIN');

        INSERT INTO EmployeeStatusRequests (employeeId, requestedBy, departmentId, requestType, status, approvalRequestId, reason)
        VALUES
          (@it3Id,  @itMgrId,  @itDeptId,  'ACTIVATE_EMPLOYEE',   'PENDING',  @r9,  'New hire — IT department.'),
          (@fin2Id, @finMgrId, @finDeptId, 'DEACTIVATE_EMPLOYEE', 'REJECTED', @r12, 'Employee resignation.');
      `, DB_NAME);
      log('  Seeded status requests.');
    } else {
      log('Seed data already exists — skipping seeding.');
    }

    log('');
    log('Database setup complete!');
    log('');
    log('Demo Accounts (Password: Password123!):');
    log('  Admin:           admin@approval.local');
    log('  IT Manager:      manager.it@approval.local');
    log('  Finance Manager: manager.finance@approval.local');
    log('  IT Employee 1:   employee.it1@approval.local');
    process.exit(0);
  } catch (err) {
    logError(err.message);
    process.exit(1);
  }
}

main();
