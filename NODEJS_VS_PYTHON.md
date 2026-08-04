# Express.js (Node.js) vs. FastAPI (Python): Actual Code Implementation Comparison

This comparative document is based directly on the actual codebase implementations built for the **Approval Management API** across **Week 1 (`week 1/`)** and **Week 2 (`week 2/`)**. It provides real, side-by-side code snippets from both projects to highlight architectural differences, trade-offs, and shared backend principles.

---

## 📋 Table of Contents
1. [Architecture & Framework Overview](#1-architecture--framework-overview)
2. [Side-by-Side Code Comparisons](#2-side-by-side-code-comparisons)
   - [GET Route Implementation](#1-get-route-implementation)
   - [POST Route Implementation](#2-post-route-implementation)
   - [Data Validation](#3-data-validation)
   - [JWT Authentication](#4-jwt-authentication)
   - [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
   - [Error Handling & Response Envelopes](#6-error-handling--response-envelopes)
   - [Async Execution & Concurrency](#7-async-execution--concurrency)
   - [Automated Testing](#8-automated-testing)
3. [Key Engineering Trade-offs](#3-key-engineering-trade-offs)
4. [Concepts Transferred Between Implementations](#4-concepts-transferred-between-implementations)
5. [Summary Decision Matrix](#5-summary-decision-matrix)

---

## 1. Architecture & Framework Overview

| Feature / Dimension | Week 1: Node.js + Express.js | Week 2: Python + FastAPI |
| :--- | :--- | :--- |
| **Runtime & Concurrency** | Single-threaded V8 event loop (Asynchronous non-blocking I/O) | Python 3.12 ASGI (Starlette + Uvicorn asyncio event loop) |
| **Validation Mechanism** | Imperative `express-validator` middleware chains | Declarative Pydantic v2 schemas integrated with Python type hints |
| **Dependency / Auth Flow** | Middleware pipeline modifying request object (`req.user`) | Declarative Dependency Injection (`Depends(get_current_user)`) |
| **OpenAPI / Swagger** | Manual JSDoc comments + `swagger-jsdoc` | Automatic schema generation served live at `/docs` and `/redoc` |
| **Validation HTTP Code** | `400 Bad Request` | `422 Unprocessable Entity` (FastAPI Native) |
| **Testing Tooling** | Jest + Supertest | Pytest + Starlette TestClient |

---

## 2. Side-by-Side Code Comparisons

### 1. GET Route Implementation

#### Express.js (`week 1/src/routes/approval.routes.js` & `approval.controller.js`)
```javascript
// Route definition
router.get('/:id', approvalController.getApprovalById);

// Controller handler
const getApprovalById = (req, res) => {
  const { id } = req.params;
  const approval = approvals.find((item) => item.id === id);

  if (!approval) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Approval request retrieved successfully.', approval, HTTP_STATUS.OK);
};
```

#### FastAPI (`week 2/app/api/v1/endpoints/approvals.py`)
```python
# Router definition with path parameter and dependency injection
@router.get("/{approval_id}", summary="Get approval by ID")
async def get_approval_by_id(
    approval_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    approval = next((item for item in approvals if item["id"] == approval_id), None)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )
    return format_success_response(message="Approval request retrieved successfully.", data=approval, request=request)
```

---

### 2. POST Route Implementation

#### Express.js (`week 1/src/routes/approval.routes.js` & `approval.controller.js`)
```javascript
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ min: 3 }),
  body('description').trim().notEmpty().withMessage('Description is required.').isLength({ min: 5 }),
], validate, approvalController.createApproval);

const createApproval = (req, res) => {
  const { title, description } = req.body;
  const newApproval = { id: uuidv4(), title, description, requesterId: req.user.id, status: 'PENDING' };
  approvals.push(newApproval);
  return sendSuccess(res, MESSAGES.APPROVAL_CREATED, newApproval, HTTP_STATUS.CREATED);
};
```

#### FastAPI (`week 2/app/api/v1/endpoints/approvals.py`)
```python
@router.post("", summary="Create approval request", status_code=status.HTTP_201_CREATED)
async def create_approval(
    payload: ApprovalCreate,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    new_approval = {
        "id": f"req-{uuid.uuid4().hex[:8]}",
        "title": payload.title,
        "description": payload.description,
        "requesterId": current_user["id"],
        "status": ApprovalStatus.PENDING,
    }
    approvals.append(new_approval)
    return format_success_response(message=Messages.APPROVAL_CREATED, data=new_approval, request=request)
```

---

### 3. Data Validation

#### Express.js (`week 1/src/middleware/validation.middleware.js`)
```javascript
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({ field: err.path, message: err.msg }));
    return sendError(res, 'Validation failed. Please check input fields.', formattedErrors, HTTP_STATUS.BAD_REQUEST);
  }
  next();
};
```

#### FastAPI (`week 2/app/schemas/approval.py` & `app/main.py`)
```python
# Pydantic Schema Model
class ApprovalCreate(BaseModel):
    title: str = Field(..., min_length=3, description="Title of approval request")
    description: str = Field(..., min_length=5, description="Detailed description")

# Exception Handler in main.py formatting Pydantic 422 errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    formatted_errors = [{"field": " -> ".join([str(l) for l in err["loc"] if l != "body"]), "message": err["msg"]} for err in exc.errors()]
    return JSONResponse(status_code=422, content=format_error_response("Validation failed.", 422, formatted_errors, request))
```

---

### 4. JWT Authentication

#### Express.js (`week 1/src/middleware/auth.middleware.js`)
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return sendError(res, 'Access denied. No token provided.', null, HTTP_STATUS.UNAUTHORIZED);

  const decoded = verifyToken(token);
  req.user = decoded;
  next();
};
```

#### FastAPI (`week 2/app/dependencies/auth.py`)
```python
security_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Access denied. No token provided.")
    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = next((u for u in users if u["id"] == payload.get("id")), None)
    return user
```

---

### 5. Role-Based Access Control (RBAC)

#### Express.js (`week 1/src/middleware/role.middleware.js`)
```javascript
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Access denied. You do not have permission to perform this action.', null, HTTP_STATUS.FORBIDDEN);
    }
    next();
  };
};
```

#### FastAPI (`week 2/app/dependencies/rbac.py`)
```python
def require_roles(*allowed_roles: str) -> Callable:
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied. Insufficient permissions.")
        return current_user
    return role_checker
```

---

### 6. Error Handling & Response Envelopes

#### Express.js (`week 1/src/utils/response.util.js`)
```javascript
const sendError = (res, message, errors = null, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    errors: errors || undefined,
    meta: createMeta(res.req)
  });
};
```

#### FastAPI (`week 2/app/core/responses.py` & `main.py`)
```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    payload = format_error_response(message=str(exc.detail), status_code=exc.status_code, request=request)
    return JSONResponse(status_code=exc.status_code, content=payload)
```

---

### 7. Async Execution & Concurrency

- **Express**: All handlers execute asynchronously on V8's single-threaded event loop. Standard callbacks or promises (`async/await`) manage non-blocking I/O seamlessly.
- **FastAPI**: Declaring routes with `async def` allows Uvicorn (ASGI) to yield control back to Python's asyncio event loop during asynchronous I/O operations.

---

### 8. Automated Testing

#### Jest + Supertest (`week 1/tests/auth.test.js`)
```javascript
const request = require('supertest');
const app = require('../src/app');

test('POST /api/v1/auth/login success', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'employee@example.com', password: 'employee123' });
  expect(res.statusCode).toEqual(200);
  expect(res.body.success).toBe(true);
});
```

#### Pytest + Starlette TestClient (`week 2/tests/test_auth.py`)
```python
def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={"email": "employee@example.com", "password": "employee123"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
```

---

## 3. Key Engineering Trade-offs

### Node.js / Express.js
- **Pros**: Lightweight, vast npm ecosystem, fast event-driven I/O throughput, high developer familiarity across JavaScript teams.
- **Cons**: Imperative validation can lead to duplicate schema definitions; manual OpenAPI documentation effort; weak compile-time type safety unless paired with TypeScript.

### Python / FastAPI
- **Pros**: Exceptional developer productivity with automatic interactive Swagger docs; Pydantic v2 type enforcement; elegant dependency injection pattern.
- **Cons**: Slightly higher CPU overhead per request compared to V8; Python GIL limits multi-core CPU scaling unless using multi-worker processes.

---

## 4. Concepts Transferred Between Implementations

Regardless of language or framework, core backend architecture principles remained 100% consistent across Week 1 and Week 2:
1. **RESTful Resource URI Design**: Pluralized endpoint nouns (`/api/v1/approvals`, `/api/v1/users`).
2. **Stateless JWT Security Model**: Exchanging credentials for signed Bearer tokens.
3. **Role-Based Access Control (RBAC)**: Restricting route capabilities based on claims.
4. **Standardized Response Envelope**: Uniform JSON structure containing `success`, `message`, `data`/`errors`, and request metadata (`timestamp`, `correlationId`, `version`).
5. **Observability & Request Tracing**: Passing `X-Correlation-Id` across middleware layers.

---

## 5. Summary Decision Matrix

- **Choose Express.js** when building lightweight microservices, high-concurrency real-time WebSocket applications, or working in a full-stack JavaScript environment.
- **Choose FastAPI** when building data-intensive APIs, machine learning pipelines, or when automatic documentation, Python typing, and Pydantic validation are prioritized.
