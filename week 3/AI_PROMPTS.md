# AI Prompt Engineering Log — Week 3 Self-Study

This document logs concrete AI prompt interactions used during the development of the Week 3 Angular and Vue.js Approval Management frontends.

---

## 🤖 Prompt Record 1: Angular Functional Interceptor Design

### Prompt Text
> "Create a modern Angular 19 functional HTTP interceptor `authInterceptor` that attaches a Bearer token from `AuthService` to outgoing requests and catches 401 unauthorized errors to logout the user and redirect to `/login`."

### Purpose
Implement modern Angular 19 functional interceptor patterns (`HttpInterceptorFn`) instead of legacy class-based interceptors (`HttpInterceptor`).

### AI Output
Generated `authInterceptor` function using `inject(AuthService)` and RxJS `catchError` pipe.

### Code Review & Manual Adjustments
- Verified that `inject(Router)` was used cleanly inside the error handler function.
- Confirmed compatibility with `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`.

### What Was Learned
Modern Angular 19 simplifies HTTP pipeline configuration by eliminating class boilerplate for interceptors in favor of composable functional interceptors.

---

## 🤖 Prompt Record 2: Vue 3 Props & Emits Component Architecture

### Prompt Text
> "Design a reusable Vue 3 TypeScript component `ApprovalStatusBadge.vue` using `<script setup>` that accepts a `status` string prop and conditionally emits a `filter-status` event when clicked."

### Purpose
Satisfy Week 3 Slide 17 requirements for demonstrating Vue Props (`defineProps`) and Vue Events (`defineEmits`).

### AI Output
Generated `ApprovalStatusBadge.vue` with `withDefaults(defineProps<{ status: string; clickable?: boolean }>())` and `defineEmits<{ (e: 'filter-status', status: string): void }>()`.

### Code Review & Manual Adjustments
- Added CSS status class binding `:class="status"` matching `PENDING`, `APPROVED`, and `REJECTED` design tokens.
- Created unit test in `ApprovalStatusBadge.test.ts` to test event emission.

### What Was Learned
Vue 3 `script setup` provides type-safe prop and emit definitions directly with TypeScript generics without needing manual runtime type maps.

---

## 🤖 Prompt Record 3: Visual Parity & Shared CSS Design Tokens

### Prompt Text
> "Design a clean, modern CSS token system (`:root`) suitable for both Angular and Vue SPAs featuring centered login cards, responsive data tables, status badges, and loading spinners."

### Purpose
Ensure both Angular and Vue applications maintain identical visual language and professional styling without over-engineering with heavy third-party UI frameworks.

### AI Output
Generated CSS design tokens including color palettes, shadow depths, card radii, status badge colors, and loading keyframe animations.

### Code Review & Manual Adjustments
- Applied CSS file to `src/styles.css` (Angular) and `src/style.css` (Vue).
- Added `.demo-btn-group` styling for quick demo login credential buttons.

### What Was Learned
Sharing design tokens and CSS class names between frameworks ensures that comparative evaluations focus on framework mechanics rather than UI differences.
