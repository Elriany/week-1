# Week 4 — Engineering Challenges & Solutions

This document details real engineering challenges encountered during the design and implementation of the Week 4 Approval Workflow Management System and the technical solutions applied.

---

## 1. Challenge: SQL Server Windows Authentication in Node.js

### Problem
Windows Authentication (`Integrated Security=true` / `trustedConnection: true`) requires native Windows security libraries (SSPI). The standard pure-JavaScript `tedious` driver does not support native SSPI authentication out of the box, requiring `msnodesqlv8`. On Windows environments lacking C++ build tools or specific Python configurations, installing `msnodesqlv8` as a hard dependency can cause build failures.

### Solution
Created a smart database configuration layer (`src/config/database.js`).
1. Placed `msnodesqlv8` in `optionalDependencies` so `npm install` never fails.
2. Dynamically attempts to require `mssql/msnodesqlv8` for Windows Authentication when `DB_TRUSTED_CONNECTION=true`.
3. Falls back gracefully to `tedious` driver with explicit error diagnostics if `msnodesqlv8` is not present, allowing SQL authentication credentials via `.env` without breaking application launch.

---

## 2. Challenge: Circular Entity Dependencies (`Users` vs `Departments`)

### Problem
A User belongs to a Department (`Users.departmentId → Departments.id`), while a Department has a Manager who is a User (`Departments.managerId → Users.id`). Direct table creation with foreign keys leads to circular creation failures.

### Solution
Structured migrations in 4 distinct steps:
1. Created `Roles` lookup table.
2. Created `Departments` table *without* the `managerId` foreign key constraint.
3. Created `Users` table with foreign keys referencing `Roles.id` and `Departments.id`.
4. Executed an `ALTER TABLE` statement adding `FK_Departments_Manager` from `Departments.managerId` to `Users.id`.

---

## 3. Challenge: Multi-Record Transactional Workflow Integrity

### Problem
Approving an employee activation request requires updating 4 separate database entities:
1. `EmployeeStatusRequests.status` → `APPROVED`
2. `Users.status` → `ACTIVE`
3. `ApprovalRequests.status` → `APPROVED`
4. `ApprovalHistory` → New audit record

If any single step fails (e.g. database timeout or constraint failure), partial database state could corrupt the workflow.

### Solution
Implemented SQL Server transactions via `pool.transaction()`. All four updates execute within `await transaction.begin()`, and `await transaction.commit()` is called only if all queries succeed. Any error triggers an immediate `await transaction.rollback()`.

---

## 4. Challenge: Preserving History Across Request Resubmissions

### Problem
When a request is rejected and resubmitted by an employee, naive implementations overwrite the previous status and rejection comments, destroying audit history.

### Solution
Designed an attempt counter (`attempt`) on `ApprovalRequests`. When resubmitted:
- The `ApprovalRequests.attempt` field increments (Attempt 1 → Attempt 2).
- Status changes from `REJECTED` to `RESUBMITTED` and then to the target review state (`PENDING_MANAGER` or `PENDING_ADMIN`).
- All previous rejection history entries and comments remain untouched in `ApprovalHistory` and `ApprovalComments`, allowing the UI to display complete chronological attempt history.
