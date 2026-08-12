# Week 4 — Final Business Demo Walkthrough

This document provides a 5–10 minute step-by-step business demonstration narrative proving all 7 end-to-end assignment scenarios.

---

## Demo Credentials (Password: `Password123!`)

- **Admin**: `admin@approval.local`
- **IT Manager**: `manager.it@approval.local`
- **Finance Manager**: `manager.finance@approval.local`
- **IT Employee 1**: `employee.it1@approval.local`
- **IT Employee 2**: `employee.it2@approval.local`

---

## Business Demonstration Flow

### Scenario 1: Employee Creates Request
1. Open `http://localhost:5173/login`.
2. Click **Employee Demo** to populate `employee.it1@approval.local` and click **Sign In**.
3. Dashboard displays Employee KPIs (**My Requests**, **Pending**, **Approved**, **Rejected**).
4. Click **New Request** in sidebar or top bar.
5. Fill form: Title = `"Request New Curved Monitor"`, Priority = `HIGH`, Description = `"Need dual-monitor setup for dev work."`.
6. Click **Submit for Approval**. Request is created as `APR-2026-000013` in state `PENDING_MANAGER`.
7. Navigate to **My Requests**. Verify request is visible.
8. Verify Employee cannot see other employees' requests.

---

### Scenario 2: Manager Reviews & Rejects Request with Mandatory Comment
1. Sign out and click **Manager Demo** (`manager.it@approval.local`). Sign In.
2. Manager Dashboard displays IT Department Employees, Pending Reviews, and Status Requests.
3. Navigate to **Requests** or open `APR-2026-000002` ("Software License - Adobe CC").
4. Click **Reject Request**.
5. Leave field empty and click Confirm -> Verify mandatory comment error pops up.
6. Enter reason: `"Please resubmit with client project details."` and click **Confirm Rejection**.
7. Request status transitions to `REJECTED`, rejection comment is recorded in history and comments timeline.

---

### Scenario 3: Employee Views Rejection & Resubmits (Attempt #2)
1. Sign out and sign in back as `employee.it1@approval.local`.
2. Open `APR-2026-000002`. Rejection banner appears prominently highlighting the rejection reason.
3. Click **Resubmit Request (Attempt #2)**.
4. Enter updated justification: `"Resubmitting for client-facing design deliverables on Project Alpha."`
5. Click **Confirm Resubmission**. Request status transitions to `PENDING_MANAGER`, attempt counter increments to #2, and previous rejection history remains intact.

---

### Scenario 4: Manager Submits Request to Admin
1. Sign in as `manager.it@approval.local`.
2. Click **New Request** -> Type defaults to `MANAGER_REQUEST`.
3. Title = `"New Cloud Server Cluster"`, Priority = `URGENT`. Click **Submit for Approval**.
4. Request is created in state `PENDING_ADMIN`.

---

### Scenario 5: Admin Approves Manager Request
1. Sign out and click **Admin Demo** (`admin@approval.local`).
2. Admin Dashboard displays organization-wide KPIs (**Departments**, **Managers**, **Employees**, **Pending Approvals**, **Status Requests**).
3. Open `APR-2026-000005` or the newly submitted manager request.
4. Click **Approve Request**, enter optional note: `"Approved. Allocate from Q3 infrastructure budget."`, click **Confirm Approval**.
5. Status updates to `APPROVED`. History and comments update.

---

### Scenario 6: Manager Requests Employee Activation & Admin Approves
1. Sign in as `manager.it@approval.local`.
2. Navigate to **My Department**. Locate employee `Tamer Farouk` (Status: `PENDING_ACTIVATION`).
3. Click **Request Activation**, enter reason: `"New hire onboarding complete."` and submit.
4. Sign in as `admin@approval.local`.
5. Navigate to **Status Requests**. Locate Tamer Farouk's activation request.
6. Click **Approve**. Atomic SQL transaction executes updating status request to `APPROVED`, employee status to `ACTIVE`, approval request to `APPROVED`, and adding audit history.

---

### Scenario 7: Manager Requests Employee Deactivation & Admin Rejects
1. Sign in as `manager.finance@approval.local`.
2. Navigate to **My Department**. Locate `Dina Nasser` (Status: `ACTIVE`).
3. Click **Request Deactivation**, enter reason: `"Resignation processing."` and submit.
4. Sign in as `admin@approval.local`.
5. Navigate to **Status Requests**. Locate deactivation request `APR-2026-000012`.
6. Click **Reject**, enter required comment: `"Pending exit interview completion."` and confirm.
7. Deactivation request is rejected; employee Dina Nasser remains `ACTIVE`.
