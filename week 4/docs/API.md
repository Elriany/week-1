# Week 4 — REST API Specification

The Node.js + Express backend provides 29 RESTful endpoints mounted at `/api/v1`. Interactive Swagger OpenAPI documentation is available at `http://localhost:3000/api-docs`.

---

## Response Envelope Structure

### Success Response
```json
{
  "success": true,
  "message": "Data retrieved successfully.",
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-12T22:00:00.000Z",
    "requestId": "d8a1f8e2-..."
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully.",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 42,
      "totalPages": 5
    }
  },
  "meta": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "You are not authorized to access this resource.",
  "errors": [
    { "field": "authorization", "message": "Role requirement not met." }
  ],
  "meta": { ... }
}
```

---

## Endpoint Summary Table

| Method | Endpoint | Allowed Roles | Description |
|--------|----------|---------------|-------------|
| **GET** | `/api/v1/health` | Public | Health check |
| **POST** | `/api/v1/auth/login` | Public | Authenticate user & return JWT (Rate-limited: 10 req/15m) |
| **GET** | `/api/v1/auth/me` | Any Authenticated | Get current logged-in user details |
| **GET** | `/api/v1/dashboard` | Any Authenticated | Get role-aware KPI counters and recent activity |
| **GET** | `/api/v1/departments` | ADMIN | List departments with pagination & search |
| **POST** | `/api/v1/departments` | ADMIN | Create a new department |
| **GET** | `/api/v1/departments/:id` | ADMIN | Get department details by ID |
| **PUT** | `/api/v1/departments/:id` | ADMIN | Update department or reassign manager |
| **GET** | `/api/v1/managers` | ADMIN | List managers with pagination & search |
| **POST** | `/api/v1/managers` | ADMIN | Create a new manager & assign department |
| **PUT** | `/api/v1/managers/:id` | ADMIN | Update manager details or department assignment |
| **GET** | `/api/v1/employees` | ADMIN, MANAGER | List employees (Admin: all, Manager: own department) |
| **POST** | `/api/v1/employees` | MANAGER | Add a new employee to manager's department |
| **GET** | `/api/v1/employees/:id` | ADMIN, MANAGER | Get employee details by ID |
| **POST** | `/api/v1/employees/:id/activation-request` | MANAGER | Request employee activation (creates status + approval request) |
| **POST** | `/api/v1/employees/:id/deactivation-request` | MANAGER | Request employee deactivation |
| **GET** | `/api/v1/requests` | Any Authenticated | List requests (role-scoped, paginated, filtered by status/type) |
| **POST** | `/api/v1/requests` | EMPLOYEE, MANAGER | Create a new approval request |
| **GET** | `/api/v1/requests/:id` | Any Authenticated | Get approval request details by ID |
| **POST** | `/api/v1/requests/:id/submit` | EMPLOYEE, MANAGER | Submit draft request for review |
| **POST** | `/api/v1/requests/:id/approve` | MANAGER, ADMIN | Approve request |
| **POST** | `/api/v1/requests/:id/reject` | MANAGER, ADMIN | Reject request (Mandatory comment required) |
| **POST** | `/api/v1/requests/:id/resubmit` | EMPLOYEE, MANAGER | Resubmit rejected request (Increments attempt counter) |
| **POST** | `/api/v1/requests/:id/cancel` | EMPLOYEE, MANAGER | Cancel pending or draft request |
| **GET** | `/api/v1/requests/:id/comments` | Any Authorized | List comments for an approval request |
| **POST** | `/api/v1/requests/:id/comments` | Any Authorized | Post a comment to an approval request |
| **GET** | `/api/v1/requests/:id/history` | Any Authorized | List audit timeline entries for a request |
| **GET** | `/api/v1/status-requests` | ADMIN | List pending employee status change requests |
| **POST** | `/api/v1/status-requests/:id/approve` | ADMIN | Approve employee status change (SQL Transaction) |
| **POST** | `/api/v1/status-requests/:id/reject` | ADMIN | Reject employee status change (SQL Transaction) |
| **GET** | `/api/v1/audit/history` | ADMIN | Global system audit history log |
