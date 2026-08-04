# AI Prompts & Engineering Assistance Log

This document records key AI prompts utilized during the design, architecture, and implementation of the **Approval Management API**, along with engineering explanations of why each prompt was effective.

---

## AI Prompt 1: Middleware Architecture & Layered Folder Structure

### Prompt Used:
> "Act as a Senior Node.js Technical Lead. Help me design a simple, beginner-friendly Express.js project architecture for an Approval Workflow API. The project must NOT use any database or ORM—only JavaScript arrays in a data directory. Generate a clean folder structure and explain the request flow from Route to Middleware to Controller to Mock Data to JSON Response."

### Why This Prompt Was Useful:
- **Enforced Simplicity**: Explicitly instructing the AI to avoid databases, ORMs, and repository layers prevented over-engineering.
- **Clear Separation of Concerns**: Established a strict pipeline (`Routes -> Middleware -> Controllers -> Data -> Response`) which made the codebase modular and easy for beginners to trace.

---

## AI Prompt 2: Swagger OpenAPI Specification & JWT Security Scheme

### Prompt Used:
> "Provide a complete swagger-jsdoc configuration object for an Express.js API that requires JWT Bearer authentication. Document endpoints for POST /auth/login, GET /approvals, POST /approvals, and POST /approvals/:id/approve with clear request bodies, status codes (200, 201, 400, 401, 403, 404), tags, and JSON response examples."

### Why This Prompt Was Useful:
- **Interactive Documentation**: Generated accurate OpenAPI 3.0 schemas, authorizing users to test Bearer tokens directly inside Swagger UI at `/api-docs`.
- **Comprehensive OpenAPI Compliance**: Saved manual schema formatting time while ensuring exact matching with the application's standard `{ success, message, data/errors }` JSON envelope.

---

## AI Prompt 3: Jest & Supertest Automated Test Suite Setup

### Prompt Used:
> "Write integration tests using Jest and Supertest for an Express API. Include test cases for: 1) GET /health returning 200, 2) POST /auth/login returning 200 and a JWT token, 3) GET /approvals without token returning 401, 4) POST /approvals/:id/approve with Employee token returning 403 Forbidden, and 5) POST /approvals/:id/approve with Manager token returning 200 OK."

### Why This Prompt Was Useful:
- **Automated Verification**: Provided clear, reproducible assertion patterns verifying both positive (200/201) and security boundary negative cases (401/403).
- **Testing Best Practices**: Demonstrated how to retrieve a token programmatically in `beforeAll` hooks and supply it via `.set('Authorization', 'Bearer ...')` headers.
