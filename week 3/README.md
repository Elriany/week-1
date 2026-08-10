# Week 3 — Frontend Framework Self-Study (Angular + Vue.js)

Welcome to **Week 3** of the **Algoriza Enterprise Full Stack Engineering Foundation Program**.

This repository contains two independent single-page frontend applications (SPAs) built to demonstrate modern frontend engineering concepts with **Angular** and **Vue.js**. Both frontends implement the same enterprise **Approval Management** business scenario while consuming separate backend APIs.

---

## 🎯 Projects Overview & Backend Mapping

| Frontend Project | Technology Stack | Backend Mapping | Backend API URL | Mock Credentials |
| :--- | :--- | :--- | :--- | :--- |
| **`week 3/angular/`** | Angular 19, RxJS, HttpClient, Reactive Forms | **Week 1 Node.js + Express API** | `http://localhost:3000/api/v1` | `admin@example.com` / `admin123` |
| **`week 3/vue/`** | Vue 3, Composition API, Vite, Axios | **Week 2 Python + FastAPI API** | `http://localhost:8000/api/v1` | `admin@example.com` / `admin123` |

---

## 📋 Requirements Coverage Table (Slides 16, 17 & 18)

| Requirement | Angular (v19) | Vue.js (v3) | Implementation Location |
| :--- | :---: | :---: | :--- |
| **Components** | ✅ | ✅ | `components/` & `views/` |
| **Services / API Layer** | ✅ | ✅ | `services/auth.service`, `services/approval.service` |
| **Props** | N/A | ✅ | `ApprovalStatusBadge.vue` (`defineProps`) |
| **Events** | N/A | ✅ | `ApprovalStatusBadge.vue` (`defineEmits`) |
| **Routing** | ✅ | ✅ | Angular Router (`app.routes.ts`) / Vue Router (`router/index.ts`) |
| **Forms** | ✅ | ✅ | Reactive Forms (`FormBuilder`) / Reactive State (`ref`) |
| **API Calls** | ✅ | ✅ | Angular `HttpClient` / Axios Client (`api.ts`) |
| **Loading State** | ✅ | ✅ | Animated spinner overlay during HTTP calls |
| **Error Handling** | ✅ | ✅ | User-friendly alerts, 401 redirect, 403 authorization feedback |
| **Basic Validation** | ✅ | ✅ | Inline field error messages for Title (>=3) and Description (>=5) |
| **TypeScript Types** | ✅ | ✅ | Strict typing without `any` |
| **Interfaces** | ✅ | ✅ | `User`, `LoginRequest`, `Approval`, `ApiResponse` |
| **Async Handling** | ✅ | ✅ | RxJS Observables / `async/await` Promises |
| **API Models** | ✅ | ✅ | Shared JSON envelope typing |
| **List Screen** | ✅ | ✅ | Table layout with status badges and empty/error states |
| **Create Form** | ✅ | ✅ | Card form with field validations and loading feedback |

---

## 🚀 Quickstart Run Instructions

### 1. Start Backends First

Make sure the Week 1 and Week 2 backends are running in separate terminal windows:

```bash
# Terminal 1: Week 1 Node.js Backend (Port 3000)
cd "d:/Algoriza/Assignment Weeks/week 1"
npm run dev

# Terminal 2: Week 2 Python FastAPI Backend (Port 8000)
cd "d:/Algoriza/Assignment Weeks/week 2"
uvicorn app.main:app --reload --port 8000
```

### 2. Run Angular Frontend

```bash
cd "d:/Algoriza/Assignment Weeks/week 3/angular"
npm install
npm start
# Open http://localhost:4200
```

### 3. Run Vue.js Frontend

```bash
cd "d:/Algoriza/Assignment Weeks/week 3/vue"
npm install
npm run dev
# Open http://localhost:5173
```

---

## 👥 Demo Logins & Roles

Both applications feature **Quick Demo Buttons** on the login screen to easily test role-aware behaviors:

| Demo Button | Email | Password | Role | System Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **`[Admin Demo]`** | `admin@example.com` | `admin123` | `Admin` | Full access across all requests |
| **`[Manager Demo]`** | `manager@example.com` | `manager123` | `Manager` | View all requests, approve/reject |
| **`[Employee Demo]`** | `employee@example.com` | `employee123` | `Employee` | Create requests, view own requests |

---

## 📁 Source Code Structure

```text
week 3/
├── angular/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── nav/
│   │   │   │   ├── login/
│   │   │   │   ├── approval-list/
│   │   │   │   ├── approval-status-badge/
│   │   │   │   └── approval-create/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   ├── app.routes.ts
│   │   │   └── app.component.ts
│   │   ├── environments/
│   │   ├── styles.css
│   │   └── main.ts
│   ├── angular.json
│   ├── package.json
│   └── README.md
├── vue/
│   ├── src/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── router/
│   │   ├── services/
│   │   ├── types/
│   │   ├── views/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   ├── vite.config.ts
│   ├── package.json
│   └── README.md
├── ANGULAR_VS_VUE.md
├── CHALLENGES.md
├── AI_PROMPTS.md
└── README.md
```

---

## 📄 Documentation Suite

- 📘 [ANGULAR_VS_VUE.md](ANGULAR_VS_VUE.md) — 28-category comparison matrix and side-by-side code snippets
- ⚠️ [CHALLENGES.md](CHALLENGES.md) — Real engineering challenges and technical solutions
- 🤖 [AI_PROMPTS.md](AI_PROMPTS.md) — AI prompt engineering records and code reviews
- 🅰️ [angular/README.md](angular/README.md) — Angular project setup guide
- 🟢 [vue/README.md](vue/README.md) — Vue project setup guide
