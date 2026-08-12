# Week 4 — SQL Server Database Documentation

This document describes the database design, ERD, tables, relationships, indexes, constraints, Windows Authentication configuration, and setup runner.

---

## 1. Database Configuration & Connection

- **Database Name**: `ApprovalWorkflowSystem`
- **Driver**: `mssql` + `msnodesqlv8` (Windows Authentication)
- **Fallback Driver**: `mssql` (tedious with SQL Authentication if native build tools are unavailable)
- **Connection String Parameters**:
  ```text
  Server=.
  Database=ApprovalWorkflowSystem
  TrustServerCertificate=True
  Integrated Security=true
  MultipleActiveResultSets=true
  ```

---

## 2. Entity-Relationship Diagram (ERD)

```text
Roles (id, name, createdAt)
  ▲
  │ (1:N)
Users (id, employeeNumber, firstName, lastName, email, phone, passwordHash, roleId, departmentId, status) ◄───┐
  ▲                                                                                                           │ (FK)
  │ (N:1)                                                                                                     │
Departments (id, code, name, description, isActive, managerId [FK to Users.id]) ──────────────────────────┘
  ▲
  │
ApprovalRequests (id, requestNumber, title, description, type, priority, status, requesterId, reviewerId, targetEmployeeId, attempt, dueDate)
  ├── ApprovalComments (id, requestId, authorId, comment, createdAt)
  ├── ApprovalHistory (id, requestId, action, fromStatus, toStatus, performedBy, comment, createdAt)
  └── EmployeeStatusRequests (id, employeeId, requestedBy, departmentId, requestType, status, approvalRequestId, reason)
```

---

## 3. Tables & Schema

### `Roles`
Lookup table for system roles: `ADMIN`, `MANAGER`, `EMPLOYEE`.

### `Departments`
Stores organizational departments: `code` (UNIQUE), `name`, `description`, `isActive`, `managerId` (FK to `Users.id`, nullable).

### `Users`
Stores all system accounts: `employeeNumber` (UNIQUE e.g. `EMP-001`), `firstName`, `lastName`, `email` (UNIQUE), `phone`, `passwordHash` (bcrypt), `roleId` (FK to `Roles.id`), `departmentId` (FK to `Departments.id`), `status` (`ACTIVE`, `INACTIVE`, `PENDING_ACTIVATION`, `PENDING_DEACTIVATION`).

### `ApprovalRequests`
Main workflow entity: `requestNumber` (UNIQUE e.g. `APR-2026-000001`), `title`, `description`, `type`, `priority`, `status`, `requesterId`, `reviewerId`, `targetEmployeeId`, `attempt` (default 1), `dueDate`.

### `ApprovalComments`
Threaded discussion notes: `requestId`, `authorId`, `comment`, `createdAt`.

### `ApprovalHistory`
Immutable audit trail: `requestId`, `action`, `fromStatus`, `toStatus`, `performedBy`, `comment`, `createdAt`.

### `EmployeeStatusRequests`
Activation and deactivation request records: `employeeId`, `requestedBy`, `departmentId`, `requestType`, `status`, `approvalRequestId` (FK to `ApprovalRequests.id`), `reason`.

---

## 4. Circular Dependency Resolution

`Users.departmentId` references `Departments.id`, while `Departments.managerId` references `Users.id`.
To avoid circular creation issues:
1. `Roles` table created first.
2. `Departments` table created without the `managerId` FK constraint.
3. `Users` table created with `roleId` and `departmentId` FK constraints.
4. `FK_Departments_Manager` foreign key constraint added to `Departments` targeting `Users.id`.

---

## 5. Performance Indexes

- `Users`: `IX_Users_Email`, `IX_Users_DepartmentId`, `IX_Users_RoleId`, `IX_Users_Status`
- `ApprovalRequests`: `IX_Requests_RequesterId`, `IX_Requests_Status`, `IX_Requests_Type`, `IX_Requests_CreatedAt`
- `ApprovalComments`: `IX_Comments_RequestId`
- `ApprovalHistory`: `IX_History_RequestId`
- `EmployeeStatusRequests`: `IX_StatusReq_EmployeeId`, `IX_StatusReq_Status`, `IX_StatusReq_ApprovalRequestId`

---

## 6. Automated Database Setup (`npm run db:setup`)

The non-destructive setup script executes via `node database/setup.js`:
1. Connects to SQL Server `master` database using Windows Authentication.
2. Checks if `ApprovalWorkflowSystem` exists; creates it if missing.
3. Connects to `ApprovalWorkflowSystem` and executes migration SQL scripts (`001` through `009`) in order.
4. Idempotently seeds roles, departments, demo users, sample requests, comments, and audit history.
5. Displays demo login credentials.
