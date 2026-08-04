# Approval Management API — Python FastAPI Implementation (Week 2)

[![Python](https://img.shields.io/badge/Python-v3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![Pydantic](https://img.shields.io/badge/Pydantic-v2.6+-red.svg)](https://docs.pydantic.dev/)
[![JWT](https://img.shields.io/badge/Authentication-JWT-orange.svg)](https://jwt.io/)
[![Pytest](https://img.shields.io/badge/Testing-Pytest-yellow.svg)](https://docs.pytest.org/)

A complete, production-ready Python FastAPI RESTful backend API created for **Algoriza Enterprise Full Stack Engineering Foundation Program (Week 2)**.

This project implements an in-memory **Approval Management API** following idiomatic FastAPI patterns, Pydantic type safety, dependency injection for auth & RBAC, structured logging, correlation ID request tracing, and automated interactive OpenAPI documentation.

---

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Sample Users & Credentials](#-sample-users--credentials)
- [Authorization Matrix](#-authorization-matrix)
- [Interactive OpenAPI Documentation](#-interactive-openapi-documentation)
- [Automated Testing](#-automated-testing)
- [Week 2 Requirements Mapping Table](#-week-2-requirements-mapping-table)
- [Documentation Suite Links](#-documentation-suite-links)

---

## 🎯 Project Overview

The **Approval Management API** simulates an enterprise internal approval system:
- **Employees** submit approval requests for equipment, software, or course reimbursements.
- **Managers** view incoming employee requests, approving or rejecting them.
- **Admins** have full system access to oversee all users and requests.

### Core Architectural Principles
- **Idiomatic FastAPI**: Leverages `APIRouter`, functional `Depends()` dependency injection, and Pydantic schemas.
- **In-Memory Storage**: Uses Python lists and dicts (`users_data.py` and `approvals_data.py`).
- **Response Envelope**: Returns standard JSON envelope `{ success, message, data/errors, meta }`.

---

## 📁 Folder Structure

```text
week 2/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── approvals.py
│   │       │   ├── auth.py
│   │       │   ├── health.py
│   │       │   └── users.py
│   │       └── router.py
│   ├── config/
│   │   ├── constants.py
│   │   └── settings.py
│   ├── core/
│   │   ├── logging.py
│   │   ├── responses.py
│   │   └── security.py
│   ├── data/
│   │   ├── approvals_data.py
│   │   └── users_data.py
│   ├── dependencies/
│   │   ├── auth.py
│   │   └── rbac.py
│   ├── middleware/
│   │   ├── correlation.py
│   │   └── logging_mw.py
│   ├── schemas/
│   │   ├── approval.py
│   │   ├── auth.py
│   │   ├── envelope.py
│   │   └── user.py
│   ├── __init__.py
│   └── main.py
├── docs/
│   ├── AI_PROMPTS.md
│   ├── API_EXAMPLES.md
│   ├── CHALLENGES.md
│   ├── FASTAPI_BASICS.md
│   ├── GIT_WORKFLOW.md
│   └── LEARNING_NOTES.md
├── logs/
│   ├── app.log
│   └── error.log
├── postman/
│   └── ApprovalManagement_FastAPI.postman_collection.json
├── tests/
│   ├── conftest.py
│   ├── test_approvals.py
│   ├── test_auth.py
│   ├── test_health.py
│   └── test_users.py
├── .env
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```

---

## 🚀 Installation & Setup

1. **Navigate to Week 2 Directory**:
   ```bash
   cd "d:/Algoriza/Assignment Weeks/week 2"
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Run FastAPI Dev Server**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Run Automated Test Suite**:
   ```bash
   pytest
   ```

---

## ⚙️ Environment Variables

Located in `.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | HTTP Server Port |
| `ENVIRONMENT` | `development` | Deployment environment |
| `JWT_SECRET` | `super_secret_jwt_key...` | JWT Token Secret Key |
| `JWT_EXPIRES_IN` | `24h` | JWT Expiration Duration |

---

## 👥 Sample Users & Credentials

| Name | Email | Password | Role | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin@example.com` | `admin123` | `Admin` | Full System Control |
| **Sarah Jenkins** | `manager@example.com` | `manager123` | `Manager` | View All Requests, Approve, Reject |
| **John Doe** | `employee@example.com` | `employee123` | `Employee` | Create Request, View/Edit/Delete Own Pending |
| **Alice Smith** | `alice@example.com` | `employee123` | `Employee` | Create Request, View/Edit/Delete Own Pending |

---

## 🛡 Authorization Matrix

| Endpoint | Action | Employee | Manager | Admin |
| :--- | :--- | :---: | :---: | :---: |
| `POST /api/v1/auth/login` | Login | ✅ | ✅ | ✅ |
| `GET /api/v1/users` | List All Users | ❌ (403) | ✅ | ✅ |
| `GET /api/v1/users/{id}` | View User Profile | ✅ (Self Only) | ✅ | ✅ |
| `GET /api/v1/approvals` | List Approvals | ✅ (Own Only) | ✅ (All) | ✅ (All) |
| `GET /api/v1/approvals/{id}` | View Approval | ✅ (Own Only) | ✅ (Any) | ✅ (Any) |
| `POST /api/v1/approvals` | Create Approval | ✅ | ✅ | ✅ |
| `PUT /api/v1/approvals/{id}` | Update Approval | ✅ (Own Pending) | ❌ | ✅ |
| `DELETE /api/v1/approvals/{id}` | Delete Approval | ✅ (Own Pending) | ❌ | ✅ |
| `POST /api/v1/approvals/{id}/approve` | Approve Request | ❌ (403) | ✅ | ✅ |
| `POST /api/v1/approvals/{id}/reject` | Reject Request | ❌ (403) | ✅ | ✅ |

---

## 📚 Interactive OpenAPI Documentation

FastAPI natively serves interactive API documentation at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc UI**: `http://localhost:8000/redoc`

---

## 📊 Week 2 Requirements Mapping Table

| Requirement Area | Implementation Status | Artifact File Location |
| :--- | :---: | :--- |
| **FastAPI Basics** | ✅ | App entrypoint & middleware in [`app/main.py`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/main.py) |
| **Routing** | ✅ | Modular `APIRouter` in [`app/api/v1/router.py`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/api/v1/router.py) |
| **Models / Schemas** | ✅ | Pydantic v2 schemas in [`app/schemas/`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/schemas/) |
| **Validation** | ✅ | Automatic field validation in Pydantic models & 422 handler |
| **API Development** | ✅ | RESTful endpoints under [`app/api/v1/endpoints/`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/api/v1/endpoints/) |
| **GET / POST / PUT / DELETE**| ✅ | Implemented for user management & approval workflow |
| **Mock Data** | ✅ | In-memory lists in [`app/data/`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/data/) |
| **Authentication** | ✅ | JWT Bearer token generation & dependency in [`app/dependencies/auth.py`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/dependencies/auth.py) |
| **Authorization** | ✅ | RBAC factory dependency in [`app/dependencies/rbac.py`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/dependencies/rbac.py) |
| **Error Handling** | ✅ | Custom exception handlers in [`app/main.py`](file:///d:/Algoriza/Assignment%20Weeks/week%202/app/main.py) |
| **Async Handling** | ✅ | ASGI handlers & Starlette async execution pipeline |
| **Swagger / OpenAPI** | ✅ | Interactive UI served dynamically at `/docs` and `/redoc` |
| **Testing** | ✅ | 24 automated unit tests in [`tests/`](file:///d:/Algoriza/Assignment%20Weeks/week%202/tests/) |
| **README / Setup** | ✅ | Comprehensive documentation & setup commands |
| **Challenges** | ✅ | Practical migration challenges in [`docs/CHALLENGES.md`](file:///d:/Algoriza/Assignment%20Weeks/week%202/docs/CHALLENGES.md) |
| **AI Usage** | ✅ | AI engineering prompts log in [`docs/AI_PROMPTS.md`](file:///d:/Algoriza/Assignment%20Weeks/week%202/docs/AI_PROMPTS.md) |
| **Backend Stack Comparison**| ✅ | Comparative guide in [`NODEJS_VS_PYTHON.md`](file:///d:/Algoriza/Assignment%20Weeks/NODEJS_VS_PYTHON.md) |

---

## 📄 Documentation Suite Links

- 📖 [FASTAPI_BASICS.md](docs/FASTAPI_BASICS.md) — Core FastAPI concepts & architecture
- 📜 [API_EXAMPLES.md](docs/API_EXAMPLES.md) — Request & response JSON payloads
- ⚠️ [CHALLENGES.md](docs/CHALLENGES.md) — Node.js to FastAPI engineering challenges
- 🌿 [GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) — Git workflow & commit history
- 📝 [LEARNING_NOTES.md](docs/LEARNING_NOTES.md) — Engineering learning takeaways
- 🤖 [AI_PROMPTS.md](docs/AI_PROMPTS.md) — AI prompt engineering record
