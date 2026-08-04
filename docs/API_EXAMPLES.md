# Approval Management API - Complete Request & Response Examples

This document provides complete, copy-pasteable JSON examples for every endpoint available in the API.

---

## 1. Health Check

### `GET /api/v1/health`
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Approval Management API is up and running healthy.",
  "data": {
    "status": "UP",
    "uptime": "42.15s",
    "timestamp": "2026-02-04T12:00:00.000Z"
  }
}
```

---

## 2. Authentication

### `POST /api/v1/auth/login`
**Request Body:**
```json
{
  "email": "employee@example.com",
  "password": "employee123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful. Authentication token generated.",
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
  }
}
```

**Failure Response (401 Unauthorized):**
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid email or password credentials.",
  "errors": [
    {
      "field": "password",
      "message": "Password is incorrect."
    }
  ]
}
```

---

## 3. Users API

### `GET /api/v1/users`
**Headers:** `Authorization: Bearer <token>` (Manager or Admin)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users retrieved successfully.",
  "data": [
    {
      "id": "usr-1",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": "Admin",
      "createdAt": "2026-01-01T08:00:00.000Z"
    },
    {
      "id": "usr-2",
      "name": "Sarah Jenkins",
      "email": "manager@example.com",
      "role": "Manager",
      "createdAt": "2026-01-02T09:00:00.000Z"
    }
  ]
}
```

---

## 4. Approvals API

### `GET /api/v1/approvals?status=PENDING&search=MacBook&page=1&pageSize=10`
**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Approval requests retrieved successfully.",
  "data": {
    "approvals": [
      {
        "id": "req-101",
        "title": "MacBook Pro Purchase Request",
        "description": "Hardware upgrade for senior developer setup and performance testing.",
        "requesterId": "usr-3",
        "status": "PENDING",
        "createdAt": "2026-02-01T10:30:00.000Z",
        "updatedAt": "2026-02-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "pageSize": 10,
      "totalPages": 1
    }
  }
}
```

### `POST /api/v1/approvals`
**Headers:** `Authorization: Bearer <token>`  
**Request Body:**
```json
{
  "title": "Dual Monitor Arm Setup",
  "description": "Ergonomic dual screen desktop mount for developer workspace."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Approval request created successfully.",
  "data": {
    "id": "req-1707048000000",
    "title": "Dual Monitor Arm Setup",
    "description": "Ergonomic dual screen desktop mount for developer workspace.",
    "requesterId": "usr-3",
    "status": "PENDING",
    "createdAt": "2026-02-04T12:00:00.000Z",
    "updatedAt": "2026-02-04T12:00:00.000Z"
  }
}
```

### `POST /api/v1/approvals/req-101/approve`
**Headers:** `Authorization: Bearer <token>` (Manager or Admin)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Approval request 'req-101' has been approved.",
  "data": {
    "id": "req-101",
    "title": "MacBook Pro Purchase Request",
    "description": "Hardware upgrade for senior developer setup and performance testing.",
    "requesterId": "usr-3",
    "status": "APPROVED",
    "createdAt": "2026-02-01T10:30:00.000Z",
    "updatedAt": "2026-02-04T12:05:00.000Z"
  }
}
```

### `POST /api/v1/approvals/req-104/reject`
**Headers:** `Authorization: Bearer <token>` (Manager or Admin)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Approval request 'req-104' has been rejected.",
  "data": {
    "id": "req-104",
    "title": "Software Development Course Subscription",
    "description": "Annual subscription to online technical course library.",
    "requesterId": "usr-4",
    "status": "REJECTED",
    "createdAt": "2026-02-04T08:45:00.000Z",
    "updatedAt": "2026-02-04T12:10:00.000Z"
  }
}
```
