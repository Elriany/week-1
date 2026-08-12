# Week 4 — Approval Workflow Management System: Business Rules

This document outlines all organizational business rules enforced across the Node.js backend REST API, Vue 3 frontend, and SQL Server persistence layer.

---

## 1. Roles & Hierarchy

There are exactly three roles in the system:

1. **ADMIN**: Highest system authority. Manages departments, managers, employees, and final status change requests. Can approve/reject manager-level requests and employee activation/deactivation requests.
2. **MANAGER**: Belongs to exactly one department. Can view and add employees in their department, submit activation/deactivation requests to ADMIN, create manager-level approval requests for ADMIN review, review employee requests from their department, and add comments.
3. **EMPLOYEE**: Belongs to a department. Can create general approval requests, view their own requests, resubmit rejected requests with updated details, cancel pending requests, and view comments/history on their requests.

---

## 2. Department & Manager Rules

- **Admin Control**: Only ADMIN users can create or edit departments.
- **One Active Manager**: A department has at most **one active manager**.
- **Single Department Assignment**: A manager can belong to at most **one active department**. A manager cannot be assigned to multiple departments simultaneously.
- **Department Scope**: Managers can only view and manage employees belonging to their assigned department. Managers cannot access employees or requests from other departments.

---

## 3. Employee Activation & Deactivation Workflow

- **Manager Submission**: Managers cannot directly change an employee's status (`ACTIVE` / `INACTIVE`). Instead, managers submit an `EmployeeStatusRequest` (`ACTIVATE_EMPLOYEE` or `DEACTIVATE_EMPLOYEE`).
- **Unified Engine**: The status request automatically generates an associated `ApprovalRequest` (`EMPLOYEE_ACTIVATION` or `EMPLOYEE_DEACTIVATION`) routed to `PENDING_ADMIN`.
- **Admin Decision & Transaction Safety**: Only ADMIN can approve or reject status requests. Approval updates the `EmployeeStatusRequest` status, the employee's `Users.status` field (`ACTIVE` or `INACTIVE`), the associated `ApprovalRequest` status, and creates an `ApprovalHistory` record within a single atomic SQL transaction.

---

## 4. Approval Request Workflow & State Transitions

Supported request types:
- `GENERAL_APPROVAL` (submitted by Employees to Manager or Manager to Admin)
- `MANAGER_REQUEST` (submitted by Manager to Admin)
- `EMPLOYEE_ACTIVATION` (submitted by Manager to Admin)
- `EMPLOYEE_DEACTIVATION` (submitted by Manager to Admin)

### Controlled Status Transitions

- `DRAFT` → `PENDING_MANAGER` or `PENDING_ADMIN` or `CANCELLED`
- `PENDING_MANAGER` → `APPROVED` or `REJECTED` or `CANCELLED`
- `PENDING_ADMIN` → `APPROVED` or `REJECTED` or `CANCELLED`
- `REJECTED` → `RESUBMITTED`
- `RESUBMITTED` → `PENDING_MANAGER` or `PENDING_ADMIN`

*Arbitrary or unvalidated status jumps are rejected with HTTP 409 Conflict.*

---

## 5. Rejection & Resubmission Rules

- **Mandatory Rejection Comment**: Rejecting a request REQUIRES a non-empty comment explaining the rejection reason.
- **History Preservation**: When a rejected request is resubmitted by the requester, the attempt counter is incremented (Attempt #1 → Attempt #2), the status returns to pending review, and all previous rejection comments/history remain intact and visible in the audit timeline.
- **No Self-Approval**: Managers cannot approve their own manager-level requests.

---

## 6. Security & Data Visibility

- **Employee**: Can ONLY view their own requests.
- **Manager**: Can view their own requests + requests from employees in their department.
- **Admin**: Full visibility across all departments and requests.
- **Comments & History**: Immutable audit history (`ApprovalHistory` table is insert/read-only). No update or delete endpoints exist for audit records.
- **Authentication**: JWT Bearer token authentication required for all protected endpoints. Inactive users are forbidden from logging in.
