# REST API Architectural Fundamentals

This guide explains the foundational principles of **RESTful Web APIs**, HTTP protocol methods, status codes, and standard JSON communication patterns implemented in the **Approval Management API**.

---

## 1. What is REST?

**REST** stands for **Representational State Transfer**. It is an architectural style designed by Roy Fielding in 2000 for network-based applications.

### Core Constraints of RESTful Architecture:
1. **Client-Server Separation**: The user interface (client) and data storage (server) are completely decoupled.
2. **Statelessness**: Every request from a client must contain all necessary information for the server to process it. The server does not store client session state between requests (e.g., JWT tokens are sent with every request).
3. **Cacheability**: Responses must define themselves as cacheable or non-cacheable to improve efficiency.
4. **Uniform Interface**: Resource identifiers (URIs) are standard, predictable, and manipulated through standard HTTP methods.
5. **Layered System**: Clients cannot tell whether they are connected directly to the end server or an intermediate proxy/load balancer.

---

## 2. HTTP Methods (Verbs)

HTTP methods indicate the intended action to be performed on a resource:

| HTTP Method | Purpose | CRUD Equivalent | Safe? | Idempotent? |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | Retrieve data from server | Read | Yes | Yes |
| **POST** | Submit new data to server | Create | No | No |
| **PUT** | Update or replace an existing resource | Update | No | Yes |
| **DELETE** | Remove a resource from server | Delete | No | Yes |

---

## 3. Standard HTTP Status Codes

Status codes report the outcome of an HTTP request:

### 2xx Success
- `200 OK`: Request succeeded. Standard response for successful GET, PUT, or DELETE operations.
- `201 Created`: Request succeeded and a new resource was successfully created (used for POST `/approvals`).

### 4xx Client Errors
- `400 Bad Request`: The request payload or parameters failed input validation.
- `401 Unauthorized`: Authentication is required or the provided token is invalid/expired.
- `403 Forbidden`: Authenticated user lacks permission to access the resource (Role Authorization failure).
- `404 Not Found`: The requested URI or resource ID does not exist.

### 5xx Server Errors
- `500 Internal Server Error`: Unhandled error occurred on the server.

---

## 4. Consistent JSON Envelope Standard

To ensure predictable integration for frontend applications, all API responses follow a uniform JSON structure:

### Success Response Format
```json
{
  "success": true,
  "message": "Human readable success message.",
  "data": {}
}
```

### Error Response Format
```json
{
  "success": false,
  "status": 400,
  "message": "Human readable error message.",
  "errors": [
    {
      "field": "title",
      "message": "Title is required."
    }
  ]
}
```
