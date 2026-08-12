# Week 4 — Manual Verification Checklist

This manual verification checklist outlines step-by-step procedures to test and confirm all system features, business rules, and security boundaries.

---

## 1. Authentication & Security Verification

- [ ] **Admin Demo Login**: Click **Admin Demo** on login page -> populates `admin@approval.local` -> click **Sign In** -> redirects to `/dashboard` with ADMIN role context in header.
- [ ] **Manager Demo Login**: Click **Manager Demo** -> populates `manager.it@approval.local` -> click **Sign In** -> redirects to `/dashboard` with MANAGER role and IT department context.
- [ ] **Employee Demo Login**: Click **Employee Demo** -> populates `employee.it1@approval.local` -> click **Sign In** -> redirects to `/dashboard` with EMPLOYEE role and IT department context.
- [ ] **Invalid Credentials**: Enter wrong password -> verify HTTP 401 error message displayed on login card.
- [ ] **Inactive Account Login**: Try logging in with an inactive user account -> verify account inactive error returned and login prevented.
- [ ] **Unauthenticated Access Protection**: Clear localStorage / token and attempt navigating directly to `http://localhost:5173/dashboard` -> verify automatic redirect to `/login`.
- [ ] **Login Rate Limiting**: Attempt 11 rapid invalid logins -> verify HTTP 429 rate limit error response.

---

## 2. Department & Manager Management (Admin)

- [ ] **List Departments**: Log in as Admin -> navigate to **Departments** -> verify table lists code, name, assigned manager, employee count, and status with pagination.
- [ ] **Create Department**: Click **Create Department** -> enter Code = `MKT`, Name = `Marketing` -> verify department added.
- [ ] **Duplicate Code Check**: Try creating a department with existing code `IT` -> verify HTTP 409 conflict error returned.
- [ ] **Assign Manager**: Navigate to **Managers** -> click **Edit / Assign Dept** on unassigned manager -> select `Marketing` -> verify manager assigned.
- [ ] **Single Manager Enforcement**: Try assigning an already assigned manager to a second department -> verify error preventing multi-department assignment.

---

## 3. Employee Management & Status Requests (Manager & Admin)

- [ ] **Department Employee Visibility**: Log in as IT Manager -> navigate to **My Department** -> verify only IT department employees (`employee.it1`, `employee.it2`, `employee.it3`) are visible.
- [ ] **Add Employee**: Click **Add Employee** -> enter details -> submit -> employee created with status `PENDING_ACTIVATION`.
- [ ] **Request Activation**: Click **Request Activation** on pending employee -> enter reason -> submit -> request created in state `PENDING_ADMIN`.
- [ ] **Admin Activation Approval**: Log in as Admin -> navigate to **Status Requests** -> click **Approve** -> verify employee status becomes `ACTIVE` in database.
- [ ] **Request Deactivation**: Log in as Finance Manager -> click **Request Deactivation** on active employee -> submit -> request created in state `PENDING_ADMIN`.
- [ ] **Admin Deactivation Rejection**: Log in as Admin -> navigate to **Status Requests** -> click **Reject** without reason -> verify validation error -> enter reason -> submit -> verify employee status remains `ACTIVE`.

---

## 4. Approval Workflow, Rejection, & Resubmission

- [ ] **Create & Submit Request**: Log in as Employee -> click **New Request** -> fill title and description -> click **Submit for Approval** -> request created with request number `APR-2026-XXXXXX` in state `PENDING_MANAGER`.
- [ ] **Employee Request Isolation**: Log in as Finance Employee -> navigate to **My Requests** -> verify IT Employee's request is NOT visible.
- [ ] **Manager Rejection**: Log in as IT Manager -> open request -> click **Reject Request** without comment -> verify mandatory comment error -> enter reason -> confirm -> status becomes `REJECTED`.
- [ ] **Employee Resubmission**: Log in as IT Employee -> open rejected request -> verify rejection callout banner displaying reason -> click **Resubmit Request (Attempt #2)** -> enter additional details -> submit -> status becomes `PENDING_MANAGER`, attempt counter increments to #2, previous history preserved.
- [ ] **Manager Request to Admin**: Log in as IT Manager -> create request -> status becomes `PENDING_ADMIN` -> log in as Admin -> open request -> click **Approve Request** -> status becomes `APPROVED`.

---

## 5. Comments, Audit History, & Responsiveness

- [ ] **Add Comment**: Open request details -> type comment in discussion box -> click **Post Comment** -> comment appears with author name, role, and timestamp.
- [ ] **Request Audit Timeline**: Verify activity timeline displays all steps (`REQUEST_CREATED`, `SUBMITTED`, `REJECTED`, `RESUBMITTED`, `APPROVED`) in chronological order.
- [ ] **Global Audit Trail**: Log in as Admin -> navigate to **Audit Trail** -> verify system-wide log with action filter and search.
- [ ] **Responsive Design**: Resize browser to mobile width (<768px) -> verify sidebar navigation collapses, tables scroll horizontally, and card layouts stack gracefully.
