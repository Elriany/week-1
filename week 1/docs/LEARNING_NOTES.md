# Engineering Foundation Week 1 - Key Learning Summaries

This document captures the core concepts learned and practiced during the development of the **Approval Management API**.

---

## 1. RESTful API Design & HTTP Mechanics
- Learned how HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) map to CRUD actions.
- Realized the importance of returning correct HTTP Status Codes (e.g., `201 Created` vs `200 OK`, `401 Unauthorized` for auth failure vs `403 Forbidden` for role restriction).
- Formatted all server responses inside a predictable standard envelope (`{ success, message, data/errors }`).

## 2. Express Middleware Architecture
- Express middleware functions process requests sequentially in the order they are registered via `app.use()`.
- **Logger Middleware**: Used `res.on('finish')` to calculate precise response execution latency.
- **Auth Middleware**: Extracted Bearer token from headers, verified signature, and injected `req.user`.
- **Role Middleware**: Implemented higher-order closure function `authorizeRoles(...allowedRoles)` to enforce granular RBAC.
- **Error Handling**: Implemented 4-parameter `(err, req, res, next)` global error handling middleware.

## 3. JWT & Role-Based Authorization
- **Stateless Authentication**: Server signs user credentials into a token with `jsonwebtoken` without storing state in sessions.
- **Role Enforcement**:
  - `Employee`: Restricted to viewing own profile and own approval requests. Can edit/delete requests only when `PENDING`.
  - `Manager`: Can view all requests across employees, approve, and reject requests.
  - `Admin`: Unrestricted access across all resources.

## 4. Query Features: Filtering, Searching, Pagination & Sorting
- Handled query string parameters (`req.query`).
- Applied array operations (`filter`, `sort`, `slice`) directly on JavaScript arrays.
- Structured paginated metadata including `total`, `page`, `pageSize`, and `totalPages`.

## 5. Swagger OpenAPI & Automated Testing
- Leveraged `swagger-ui-express` and `swagger-jsdoc` to provide an interactive API playground at `/api-docs`.
- Wrote unit/integration tests with `Jest` and `Supertest` to verify status codes and JSON payloads automatically.
