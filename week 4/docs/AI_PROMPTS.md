# Week 4 — AI Prompt Engineering Log & Code Review

This document logs the prompts, design intent, manual review steps, and safety validations performed during AI-assisted development of the Week 4 Approval Workflow Management System.

---

## AI Engineering & Review Summary

| Task Area | Prompt Intent | Generated Output | Manual Review & Refinements |
|-----------|---------------|------------------|-----------------------------|
| **Database Setup & Schema** | Design non-destructive setup runner and SQL schema resolving circular dependencies | `database/setup.js` & SQL migrations (`001`-`009`) | Verified Windows Auth connection logic; ensured `master` DB check prevents dropping existing DBs; verified deferred FK `FK_Departments_Manager`. |
| **Workflow Engine & RBAC** | Implement controlled state transitions and role/department authorization middleware | `request.service.js`, `auth.middleware.js`, `role.middleware.js` | Enforced server-side checks so Employees cannot see other employees' requests, and Managers cannot access other departments. |
| **Transactional Status Changes** | Implement SQL Server transactions for Employee Activation/Deactivation | `statusRequest.service.js` | Verified atomic rollback on failure across `EmployeeStatusRequests`, `Users`, `ApprovalRequests`, and `ApprovalHistory`. |
| **Vue 3 UI & Design System** | Create responsive, role-aware Vue 3 dashboard with PrimeVue 4 and CSS custom properties | `AppLayout.vue`, `DashboardView.vue`, `RequestDetailView.vue` | Refined CSS contrast, added attempt badges (`Attempt #2`), highlighted rejection comments, ensured zero raw Unicode icons. |

---

## Security & AI Safety Compliance

1. **No Hardcoded Secrets**: Verified that JWT secrets and database connection credentials are loaded from environment variables (`.env`).
2. **Password Hashing**: Verified `bcryptjs` rounds set to 10 for password hashing before database insertion.
3. **Parameterized Queries**: Inspected all repository SQL queries to confirm inputs are parameterized via `request.input()`, eliminating SQL injection risks.
4. **No Automated Tests**: Complied with strict requirement to avoid automated test suites (Jest/Vitest/Cypress) and focus on manual verification checklists.
