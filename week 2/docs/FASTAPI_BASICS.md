# FastAPI Basics & Architecture Guide

## Overview
FastAPI is a modern, high-performance web framework for building APIs with Python based on standard Python type hints, Pydantic data validation, and Starlette/ASGI concurrency.

---

## Core Components in Week 2 Architecture

### 1. Application Entrypoint (`app/main.py`)
- Initializes `FastAPI()` app.
- Attaches ASGI Middlewares (Correlation ID, Logging, CORS).
- Mounts APIRouter v1 with prefix `/api/v1`.
- Registers custom exception handlers for `HTTPException` and `RequestValidationError`.

### 2. Dependency Injection (`app/dependencies/`)
- `get_current_user`: Parses Bearer token from `Authorization` header, verifies signature via PyJWT, loads current user object.
- `require_roles`: Higher-order dependency function enforcing Role-Based Access Control (RBAC) for Admin, Manager, and Employee roles.

### 3. Pydantic Schemas (`app/schemas/`)
- Declarative models enforcing type validation, constraints (`min_length`), and auto-generating OpenAPI schemas.

### 4. Interactive Documentation
- **Swagger UI**: Served at `/docs`
- **ReDoc UI**: Served at `/redoc`
