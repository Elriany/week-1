# Week 4 — Final Full-Stack Assignment: Approval Workflow Management System

A production-style enterprise Approval Workflow Management System built with **Node.js + Express**, **SQL Server** (Windows Authentication / Integrated Security), and **Vue 3 + TypeScript + Vite** (PrimeVue 4).

---

## 📁 Project Structure

```text
week 4/
├── backend-nodejs/            # Node.js + Express REST API (29 endpoints)
│   ├── src/
│   │   ├── config/            # Database pool (mssql/msnodesqlv8) & Env config
│   │   ├── constants/         # HTTP status, Roles, Statuses, Messages
│   │   ├── controllers/       # Auth, Dashboard, Dept, Emp, Mgr, Req, StatusReq
│   │   ├── middleware/        # JWT Auth, RBAC, Rate Limit, Error Handler, Logger
│   │   ├── repositories/      # User, Dept, Request, Comment, History, StatusReq
│   │   ├── routes/            # API Route definitions & index
│   │   ├── services/          # Workflow engine & business rule services
│   │   ├── utils/             # Response envelope, JWT, Logger, AppError
│   │   ├── validators/        # Express-validator schemas
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # HTTP server & graceful shutdown
│   ├── database/
│   │   ├── migrations/        # 001-009 SQL schema migration scripts
│   │   └── setup.js           # Non-destructive database setup runner (npm run db:setup)
│   ├── .env.example           # Backend environment template
│   └── package.json
│
├── frontend-vuejs/            # Vue 3 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── api/               # Axios client & module API services
│   │   ├── assets/styles/     # Main CSS design system
│   │   ├── components/        # Layout shell, StatusBadge, KpiCard, ActivityTimeline
│   │   ├── composables/       # Composables & helpers
│   │   ├── router/            # Vue Router with authentication & role guards
│   │   ├── stores/            # Pinia Auth store
│   │   ├── types/             # TypeScript models & interfaces
│   │   └── views/             # 10 role-aware views (Dashboard, Requests, Depts, etc.)
│   ├── index.html             # HTML entry point
│   ├── vite.config.ts         # Vite build & proxy config
│   └── package.json
│
└── docs/                      # Comprehensive Documentation Suite
    ├── BUSINESS_RULES.md      # Enforced business rules & workflow rules
    ├── API.md                 # 29 REST API endpoint specifications
    ├── DATABASE.md            # ERD, SQL Server setup, & migration strategy
    ├── AI_PROMPTS.md          # AI prompt engineering log & code review
    ├── CHALLENGES.md          # Real challenges encountered & technical solutions
    ├── SELF_REVIEW.md         # Completion self-review checklist
    ├── DEMO.md                # 5-10 minute business demo walkthrough
    └── MANUAL_VERIFICATION.md # Step-by-step manual testing checklist
```

---

## ⚡ Quick Start & Setup

### 1. Database Setup (SQL Server + Windows Authentication)

Ensure local SQL Server is running on your machine (e.g. `localhost` or `.\SQLEXPRESS`).

```bash
cd "week 4/backend-nodejs"
npm install
npm run db:setup
```

The non-destructive setup runner:
- Connects to SQL Server `master` via Windows Authentication.
- Creates database `ApprovalWorkflowSystem` if missing.
- Runs migration scripts `001` to `009`.
- Seeds 11 demo accounts, 4 departments, 12 approval requests, comments, and audit history.

---

### 2. Start Node.js REST API Backend

```bash
cd "week 4/backend-nodejs"
npm run dev
# Server running at: http://localhost:3000
# Swagger API Docs:  http://localhost:3000/api-docs
```

---

### 3. Start Vue 3 Frontend SPA

```bash
cd "week 4/frontend-vuejs"
npm install
npm run dev
# App running at: http://localhost:5173
```

---

## 👥 Demo User Credentials (Password: `Password123!`)

The login screen features **⚡ Quick Demo Login** buttons to easily test all three roles:

| Role | Email | Password | Assigned Department |
|------|-------|----------|---------------------|
| **Admin** | `admin@approval.local` | `Password123!` | System Wide |
| **IT Manager** | `manager.it@approval.local` | `Password123!` | Information Technology |
| **Finance Manager** | `manager.finance@approval.local` | `Password123!` | Finance |
| **HR Manager** | `manager.hr@approval.local` | `Password123!` | Human Resources |
| **Ops Manager** | `manager.ops@approval.local` | `Password123!` | Operations |
| **IT Employee 1** | `employee.it1@approval.local` | `Password123!` | Information Technology |
| **IT Employee 2** | `employee.it2@approval.local` | `Password123!` | Information Technology |
| **Finance Employee** | `employee.finance1@approval.local` | `Password123!` | Finance |
| **HR Employee** | `employee.hr1@approval.local` | `Password123!` | Human Resources |

---

## 📄 Key Documentation Links

- 📋 [Business Rules (BUSINESS_RULES.md)](docs/BUSINESS_RULES.md)
- 🔌 [REST API Specification (API.md)](docs/API.md)
- 🗄️ [Database Architecture & ERD (DATABASE.md)](docs/DATABASE.md)
- 🤖 [AI Prompts & Code Review (AI_PROMPTS.md)](docs/AI_PROMPTS.md)
- ⚠️ [Engineering Challenges & Solutions (CHALLENGES.md)](docs/CHALLENGES.md)
- ✅ [Self-Review Completion Checklist (SELF_REVIEW.md)](docs/SELF_REVIEW.md)
- 🎬 [5-10 Minute Business Demo Walkthrough (DEMO.md)](docs/DEMO.md)
- 🧪 [Manual Verification Guide (MANUAL_VERIFICATION.md)](docs/MANUAL_VERIFICATION.md)
