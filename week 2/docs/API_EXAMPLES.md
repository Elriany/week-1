# FastAPI API Examples & Sample Payloads

## 1. Authentication

### Login Request
`POST /api/v1/auth/login`
```json
{
  "email": "employee@example.com",
  "password": "employee123"
}
```

### Successful Login Response
```json
{
  "success": true,
  "message": "User authenticated successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "user": {
      "id": "usr-3",
      "name": "John Doe",
      "email": "employee@example.com",
      "role": "Employee",
      "createdAt": "2026-01-03T10:00:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2026-08-04T22:30:00.000Z",
    "correlationId": "8f3b2c1a-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "version": "v1"
  }
}
```

---

## 2. Approvals

### Create Approval Request
`POST /api/v1/approvals`
Header: `Authorization: Bearer <token>`
```json
{
  "title": "4K UltraWide Monitor",
  "description": "Ergonomic monitor upgrade for frontend software development."
}
```
