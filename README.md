# Enterprise Backend Engineering Assignments

[![Node.js](https://img.shields.io/badge/Node.js-Express.js-green.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%201/README.md)
[![Python](https://img.shields.io/badge/Python-FastAPI-blue.svg)](file:///d:/Algoriza/Assignment%20Weeks/week%202/README.md)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A multi-week enterprise backend engineering repository containing comparative RESTful **Approval Management API** implementations built with **Node.js / Express.js (Week 1)** and **Python / FastAPI (Week 2)**.

---

## 📁 Repository Structure

```text
Assignment Weeks/
├── week 1/                 # Node.js / Express.js Implementation (Week 1 Foundation)
├── week 2/                 # Python / FastAPI Implementation (Week 2 Foundation)
├── NODEJS_VS_PYTHON.md     # Actual Implementation Comparative Guide
└── README.md               # Repository Overview (This Document)
```

---

## 🎯 Project Overview

This repository demonstrates enterprise backend engineering principles by building the exact same **Approval Management API** system using two backend ecosystems:

1. **Week 1: Node.js & Express.js (`week 1/`)**:
   - Built with Express.js, CommonJS, Winston logging, `express-validator`, Jest, Supertest, and `swagger-jsdoc`.
   - Feature parity: JWT Bearer authentication, RBAC (`Admin`, `Manager`, `Employee`), mock in-memory data, filtering, searching, sorting, pagination, and standardized JSON response envelopes (`{ success, message, data, meta }`).

2. **Week 2: Python & FastAPI (`week 2/`)**:
   - Built with FastAPI, Pydantic v2, PyJWT, Bcrypt, Pytest, Uvicorn, and native interactive Swagger/ReDoc OpenAPI documentation.
   - Preserves identical business logic, authorization boundaries, query mechanics, and metadata contract while using idiomatic Python type annotations and dependency injection (`Depends`).

3. **Comparative Analysis (`NODEJS_VS_PYTHON.md`)**:
   - In-depth, code-driven comparative breakdown comparing real snippets from both `week 1/` and `week 2/` across routing, validation, authentication, RBAC, error handling, async execution, testing, and engineering trade-offs.

---

## 🚀 Quick Start & Setup

### Week 1 (Node.js / Express.js)
```bash
cd "week 1"
npm install
cp .env.example .env
npm run dev
```
- Server: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/api-docs`

### Week 2 (Python / FastAPI)
```bash
cd "week 2"
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Server: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc UI: `http://localhost:8000/redoc`

---

## 🧪 Automated Testing

### Week 1 Tests (Jest + Supertest)
```bash
cd "week 1"
npm test
```

### Week 2 Tests (Pytest)
```bash
cd "week 2"
pytest
```

---

## 📄 Key Documentation Links

- 🟢 [Week 1 Readme (Express.js)](week%201/README.md)
- 🔵 [Week 2 Readme (FastAPI)](week%202/README.md)
- ⚠️ [Week 2 Challenges Guide](week%202/docs/CHALLENGES.md)
- ⚖️ [Node.js vs. Python Comparison (NODEJS_VS_PYTHON.md)](NODEJS_VS_PYTHON.md)
