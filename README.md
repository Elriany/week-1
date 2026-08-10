# Algoriza Enterprise Full-Stack Engineering Assignments

[![Node.js](https://img.shields.io/badge/Node.js-Express.js-green.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%201/README.md)
[![Python](https://img.shields.io/badge/Python-FastAPI-blue.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%202/README.md)
[![Angular](https://img.shields.io/badge/Angular-v19-red.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%203/angular/README.md)
[![Vue.js](https://img.shields.io/badge/Vue.js-v3-emerald.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%203/vue/README.md)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A multi-week enterprise engineering repository containing comparative **Approval Management System** implementations:
- **Week 1**: Node.js / Express.js RESTful API
- **Week 2**: Python / FastAPI RESTful API
- **Week 3**: Angular (v19) & Vue.js (v3) Frontend SPAs

---

## 📁 Repository Structure

```text
Assignment Weeks/
├── week 1/                 # Node.js / Express.js API (Week 1 Foundation)
├── week 2/                 # Python / FastAPI API (Week 2 Foundation)
├── week 3/                 # Frontend Framework Self-Study (Week 3)
│   ├── angular/            # Angular 19 SPA (Consumes Week 1 Node.js API)
│   ├── vue/                # Vue 3 + Vite SPA (Consumes Week 2 FastAPI API)
│   ├── ANGULAR_VS_VUE.md   # Angular vs Vue.js 28-Category Comparative Analysis
│   ├── CHALLENGES.md       # Frontend Migration & Self-Study Engineering Challenges
│   ├── AI_PROMPTS.md       # AI Prompt Engineering Log & Code Reviews
│   └── README.md           # Week 3 Master Documentation Guide
├── NODEJS_VS_PYTHON.md     # Node.js vs Python Backend Comparative Guide
└── README.md               # Repository Overview (This Document)
```

---

## 🎯 Project Overview

This repository demonstrates end-to-end full-stack engineering principles by implementing the **Approval Management** domain:

1. **Week 1: Node.js & Express.js API (`week 1/`)**:
   - Express.js REST API with JWT Bearer auth, RBAC (`Admin`, `Manager`, `Employee`), mock in-memory data, filtering, searching, sorting, pagination, and standardized JSON envelopes.

2. **Week 2: Python & FastAPI API (`week 2/`)**:
   - FastAPI REST API with Pydantic v2 schemas, PyJWT authentication, dependency injection, and automatic Swagger/ReDoc OpenAPI documentation.

3. **Week 3: Angular & Vue.js Frontend SPAs (`week 3/`)**:
   - **Angular Application (`week 3/angular`)**: Standalone components, RxJS, Angular HttpClient, Reactive Forms, Auth Guards, and HTTP interceptors connected to Week 1 API (`http://localhost:3000/api/v1`).
   - **Vue.js Application (`week 3/vue`)**: Vue 3 Composition API, Vite, TypeScript, Vue Router, Axios interceptors, and Props/Emits connected to Week 2 API (`http://localhost:8000/api/v1`).
   - Shared visual language, Centered Login cards with Quick Demo login buttons, Approvals list tables, status badges (`PENDING`, `APPROVED`, `REJECTED`), and Create Approval reactive forms.

---

## 🚀 Quick Start & Setup

### Week 1 (Node.js / Express.js Backend)
```bash
cd "week 1"
npm install
npm run dev
# Server: http://localhost:3000
```

### Week 2 (Python / FastAPI Backend)
```bash
cd "week 2"
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Server: http://localhost:8000
```

### Week 3 (Angular Frontend)
```bash
cd "week 3/angular"
npm install
npm start
# App: http://localhost:4200
```

### Week 3 (Vue.js Frontend)
```bash
cd "week 3/vue"
npm install
npm run dev
# App: http://localhost:5173
```

---

## 🧪 Automated Testing

```bash
# Week 1 API Tests
cd "week 1" && npm test

# Week 2 API Tests
cd "week 2" && pytest

# Week 3 Angular Tests
cd "week 3/angular" && npm test

# Week 3 Vue.js Tests
cd "week 3/vue" && npm run test
```

---

## 📄 Key Documentation Links

- 🟢 [Week 1 Readme (Express.js)](week%201/README.md)
- 🔵 [Week 2 Readme (FastAPI)](week%202/README.md)
- 🅰️ [Week 3 Angular Readme](week%203/angular/README.md)
- 🟢 [Week 3 Vue Readme](week%203/vue/README.md)
- 📙 [Week 3 Master Guide](week%203/README.md)
- 📊 [Angular vs. Vue Comparative Analysis (ANGULAR_VS_VUE.md)](week%203/ANGULAR_VS_VUE.md)
- ⚠️ [Week 3 Challenges Guide](week%203/CHALLENGES.md)
- 🤖 [Week 3 AI Prompt Records](week%203/AI_PROMPTS.md)
- ⚖️ [Node.js vs. Python Comparison (NODEJS_VS_PYTHON.md)](NODEJS_VS_PYTHON.md)
