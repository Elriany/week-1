# Angular vs Vue.js — Comparative Analysis & Self-Study Guide (Week 3)

This document presents a comprehensive technical comparison between **Angular (v19)** and **Vue.js (v3)** based directly on the two Approval Management frontend applications created during Week 3 self-study.

---

## 📊 Summary Comparison Matrix

| Evaluation Category | Angular (v19) | Vue.js (v3) | Technical Distinction / Key Takeaway |
| :--- | :--- | :--- | :--- |
| **Framework Philosophy** | Full-fledged opinionated framework | Progressive, flexible framework | Angular provides an all-in-one platform out of the box; Vue scales from minimal library to modular framework. |
| **Project Setup** | `@angular/cli` with build tools | Vite with `@vitejs/plugin-vue` | Vite provides near-instant HMR development server startup compared to Angular CLI bundling. |
| **Project Structure** | Modular component class files (`.ts`) | Single File Components (`.vue`) | Vue combines template, script setup, and scoped styles in one file; Angular separates class, template, and styles. |
| **Components** | Standalone Component `@Component` | Composition API `<script setup lang="ts">` | Angular uses class-based decorators; Vue uses functional setup functions with ref/computed primitives. |
| **Services** | `@Injectable({ providedIn: 'root' })` | ES modules / Composables (`useAuth.ts`) | Angular uses built-in Dependency Injection (DI); Vue relies on composition functions and ES module exports. |
| **State Handling** | RxJS `BehaviorSubject` / Signals | Vue Reactivity `ref()`, `computed()` | Angular leverages RxJS stream pipelines; Vue uses fine-grained proxy-based reactive references. |
| **Routing** | `@angular/router` | `vue-router` | Angular routing relies on class-based `CanActivateFn` guards; Vue uses `router.beforeEach` navigation guards. |
| **Forms** | Reactive Forms (`FormBuilder`, `Validators`) | Template-driven bindings (`v-model`) | Angular Reactive Forms explicitly decouple form data structures from templates; Vue uses bidirectional `v-model`. |
| **Form Validation** | Built-in synchronous/async validators | Inline reactive functions / Computed properties | Angular provides explicit form controls with dirty/touched states; Vue allows flexible custom validation functions. |
| **API Calls** | `HttpClient` (RxJS Observables) | Axios (`api.post()`, `async/await`) | Angular `HttpClient` returns RxJS `Observable`; Vue uses standard Promise-based `async/await` with Axios. |
| **HTTP Interceptors** | `HttpInterceptorFn` pipeline | Axios `interceptors.request / response` | Both allow global Bearer token attachment and 401 handling; Angular handles streams while Axios handles Promises. |
| **Authentication** | `AuthService` + `AuthGuard` + `AuthInterceptor` | `useAuth()` + Router Guard + Axios Interceptor | Similar flow: Store token in `localStorage`, attach Bearer header, protect routes, clear session on 401. |
| **Route Protection** | `canActivate: [authGuard]` in routes config | `to.meta.requiresAuth` check in global guard | Both redirect unauthenticated users to `/login` seamlessly. |
| **Component Communication** | `@Input()` and `@Output()` EventEmitter | Props (`defineProps`) & Emits (`defineEmits`) | Demonstrated in `ApprovalStatusBadge`: Angular uses property binding; Vue uses explicit prop/emit declarations. |
| **TypeScript Integration** | Native first-class TypeScript | Native TypeScript with Vue TSX/Volar | Both frontends use strict interface definitions for `User`, `Approval`, and `ApiResponse` envelopes. |
| **Async Handling** | RxJS `.subscribe()` / `async` pipe | `async / await` syntax | Angular manages asynchronous data streams with Observables; Vue handles asynchronous Promises directly. |
| **API Models & Contracts** | Shared interfaces (`approval.model.ts`) | Shared interfaces (`types/approval.ts`) | Both frontends map cleanly to backend JSON envelopes `{ success, message, data, meta }`. |
| **Loading State** | `loading: boolean` flag in component | `const loading = ref(false)` reactive ref | Both render inline spinner animations during asynchronous HTTP API execution. |
| **Error Handling** | RxJS `catchError` / HTTP status checks | `try/catch` with Axios `error.response` | Both catch network failures, 401 unauthorized, 403 forbidden, and validation errors gracefully. |
| **Developer Experience** | High initial structure & guidance | Extremely fast iteration & simple mental model | Vue is faster to prototype; Angular provides long-term enterprise predictability and pattern enforcement. |
| **Code Verbosity** | Higher boilerplate (classes, metadata) | Concise functional setup code | Angular requires more setup files per feature; Vue components are self-contained in single `.vue` files. |
| **Learning Curve** | Steeper (DI, RxJS, decorators) | Gentle & intuitive (Composition API) | Vue requires learning fewer concepts to achieve initial productivity; Angular requires mastering RxJS streams. |
| **Maintainability** | Exceptional for large multi-developer teams | High for small to medium projects | Angular's rigid structure prevents divergence across teams; Vue relies on team discipline for consistency. |
| **Performance Model** | Zone.js change detection / Signals | Proxy-based granular dependency tracking | Vue's reactivity system tracks exact properties accessed during render without dirty-checking trees. |
| **Testing Tooling** | Jasmine + Karma (`ng test`) | Vitest + Vue Test Utils (`npm run test`) | Vitest executes unit tests significantly faster with native Vite module resolution. |
| **Build Tooling** | `@angular-devkit/build-angular` (esbuild) | Vite (esbuild + Rollup) | Modern versions of both use esbuild under the hood for rapid bundling. |

---

## 💻 Real Code Snippet Comparisons

### 1. Component Definition & Architecture

#### Angular (`src/app/components/approval-status-badge/approval-status-badge.component.ts`)
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approval-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="status-badge" [ngClass]="status">{{ status }}</span>`
})
export class ApprovalStatusBadgeComponent {
  @Input({ required: true }) status: string = 'PENDING';
}
```

#### Vue.js (`src/components/ApprovalStatusBadge.vue`)
```vue
<template>
  <span class="status-badge" :class="status" @click="onBadgeClick">
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{ status: string }>();
const emit = defineEmits<{ (e: 'filter-status', status: string): void }>();

function onBadgeClick() {
  emit('filter-status', props.status);
}
</script>
```

---

### 2. Router & Guard Configuration

#### Angular Router (`src/app/app.routes.ts`)
```typescript
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'approvals', component: ApprovalListComponent, canActivate: [authGuard] },
  { path: 'approvals/create', component: ApprovalCreateComponent, canActivate: [authGuard] }
];
```

#### Vue Router (`src/router/index.ts`)
```typescript
const routes: Array<RouteRecordRaw> = [
  { path: '/login', component: LoginView },
  { path: '/approvals', component: ApprovalsListView, meta: { requiresAuth: true } },
  { path: '/approvals/create', component: ApprovalCreateView, meta: { requiresAuth: true } }
];

router.beforeEach((to, from, next) => {
  if (to.matched.some(r => r.meta.requiresAuth) && !authService.isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

---

### 3. API Services & Asynchronous Communication

#### Angular Approval Service (`src/app/services/approval.service.ts`)
```typescript
@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/approvals`;

  getApprovals(): Observable<ApiResponse<ApprovalsResponseData>> {
    return this.http.get<ApiResponse<ApprovalsResponseData>>(this.apiUrl);
  }
}
```

#### Vue Approval Service (`src/services/approval.service.ts`)
```typescript
export const approvalService = {
  async getApprovals(): Promise<ApiResponse<ApprovalsResponseData>> {
    const response = await api.get<ApiResponse<ApprovalsResponseData>>('/approvals');
    return response.data;
  }
};
```

---

### 4. Reactive Forms & Field Validation

#### Angular Form (`src/app/components/approval-create/approval-create.component.ts`)
```typescript
createForm = this.fb.group({
  title: ['', [Validators.required, Validators.minLength(3)]],
  description: ['', [Validators.required, Validators.minLength(5)]]
});

onSubmit(): void {
  if (this.createForm.invalid) {
    this.createForm.markAllAsTouched();
    return;
  }
  this.approvalService.createApproval(this.createForm.value as any).subscribe(...);
}
```

#### Vue Form (`src/views/ApprovalCreateView.vue`)
```typescript
const title = ref('');
const description = ref('');
const titleError = ref(false);

function validateTitle() {
  titleError.value = !title.value || title.value.trim().length < 3;
}

async function handleSubmit() {
  validateTitle();
  if (titleError.value) return;
  await approvalService.createApproval({ title: title.value, description: description.value });
}
```

---

### 5. HTTP Bearer Token Interceptor & 401 Redirects

#### Angular Interceptor (`src/app/interceptors/auth.interceptor.ts`)
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        inject(AuthService).logout();
        inject(Router).navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
```

#### Vue Axios Interceptor (`src/services/api.ts`)
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

---

## 🎯 Final Synthesis & Architectural Takeaways

1. **Angular** excels in structured enterprise environments where consistent architectural patterns, strict dependency injection, and RxJS reactive streams enforce long-term scalability.
2. **Vue.js** shines in agile environments where rapid development velocity, lightweight mental models, and intuitive proxy reactivity enable highly performant SPAs with lower overhead.
3. Both frameworks successfully fulfill all Week 3 requirements with complete feature parity while consuming backend APIs written in Node.js/Express and Python/FastAPI respectively.
