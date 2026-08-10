# Angular Approval Management Frontend (Week 3)

Single Page Application built with **Angular (v19)** consuming the **Week 1 Node.js + Express Approval API**.

## 🛠 Tech Stack
- Angular 19 (Standalone Components)
- Angular Router & Route Guards
- Angular HttpClient & Functional Interceptors
- Angular Reactive Forms (`FormBuilder`)
- RxJS (`BehaviorSubject`, `Observable`, `tap`, `catchError`)

## ⚙️ Environment Configuration
API base URL configured in `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1'
};
```

## 🚀 How to Run
```bash
npm install
npm start
```
App runs at `http://localhost:4200`.

## 🧪 Testing
```bash
npm test
```

## 🔐 Demo Credentials
- Admin Demo: `admin@example.com` / `admin123`
- Manager Demo: `manager@example.com` / `manager123`
- Employee Demo: `employee@example.com` / `employee123`
