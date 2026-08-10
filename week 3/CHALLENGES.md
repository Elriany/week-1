# Practical Engineering Challenges — Week 3 Self-Study

This document details the practical engineering challenges encountered during the implementation of the **Angular** and **Vue.js** Approval Management frontends, along with their technical solutions.

---

## 1. PowerShell Script Execution Restrictions & Windows CLI Paths

### Challenge
When executing CLI commands (`npm`, `ng`, `vite`) in PowerShell on Windows, execution policies restricted script execution:
```text
npm : File C:\Users\...\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

### Solution
Executed Node and npm commands explicitly via `cmd.exe` or `powershell -NoProfile -Command`. Additionally, handled directory paths with spaces (`d:\AZM Squad\Assignment Weeks`) by using node script execution for directory setup.

---

## 2. Shared Visual Design Parity Across Frameworks

### Challenge
Angular and Vue use different styling mechanics (Angular component encapsulation vs Vue Single File Component `<style scoped>`). Ensuring both applications possessed identical visual language (cards, headers, form inputs, status badges, buttons) without introducing massive CSS frameworks was critical.

### Solution
Created a shared CSS design token palette using CSS custom properties (`:root`) in `src/styles.css` (Angular) and `src/style.css` (Vue). Kept layout classes (`.card`, `.btn-primary`, `.form-control`, `.status-badge`) identical across both codebases, maintaining 100% visual parity.

---

## 3. JWT Authentication & Automatic HTTP 401 Interception

### Challenge
Protected routes require appending `Authorization: Bearer <token>` to HTTP headers. When a JWT expires or becomes invalid, both frontends must automatically clear session state and redirect to `/login` without triggering infinite redirect loops.

### Solution
- **Angular**: Implemented modern functional `HttpInterceptorFn` (`auth.interceptor.ts`) leveraging RxJS `catchError` to check `error.status === 401`, invoke `authService.logout()`, and navigate to `/login`.
- **Vue.js**: Utilized Axios response interceptors in `services/api.ts` to inspect `error.response?.status === 401`, clear `localStorage`, and redirect via `window.location.href = '/login'`.

---

## 4. Quick Demo Login Credential Population

### Challenge
The backend applications (Week 1 Node.js and Week 2 FastAPI) use mock users with predefined hashed passwords. Frontend users needed a friction-free way to test Admin, Manager, and Employee permissions without manually typing mock credentials.

### Solution
Added Quick Demo buttons (`[Admin Demo]`, `[Manager Demo]`, `[Employee Demo]`) to both login screens:
- Angular: Used `loginForm.patchValue({ email, password })`.
- Vue: Dynamically updated reactive `ref()` values.
Clicking a demo button populates credentials directly from actual backend mock data without skipping the real API login flow.

---

## 5. Reactive Form Validation vs Template Validation

### Challenge
Angular Reactive Forms require explicit form control declarations with built-in `Validators` (`Validators.required`, `Validators.minLength`), whereas Vue Composition API relies on reactive `ref()` bindings and validation helper functions.

### Solution
- Standardized validation rules on both frontends: Title requires minimum 3 characters, Description requires minimum 5 characters.
- Structured invalid feedback messages to display directly below affected input controls in red text.
- Disabled form submission buttons during active HTTP API requests to prevent duplicate submissions.

---

## 6. Response Envelope Parity (Node.js vs FastAPI)

### Challenge
Week 1 (Node.js) and Week 2 (FastAPI) deliver JSON responses using standardized envelopes:
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { ... }
}
```
Frontends needed strict TypeScript definitions to handle generic responses without using `any`.

### Solution
Created TypeScript `ApiResponse<T>` interfaces in both projects, ensuring type-safe access to payload objects (`res.data.approvals`, `res.data.user`, `res.data.token`).
