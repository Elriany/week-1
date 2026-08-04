# Git Workflow & Branching Strategy

This document outlines the professional **Git Flow** strategy recommended for developing features in backend projects.

---

## 1. Branch Hierarchy

```
main (Production Ready Code)
 ├── feature/auth           (Authentication Endpoint & JWT setup)
 ├── feature/approval-api   (Approval CRUD & Filtering/Pagination)
 ├── feature/swagger        (Swagger OpenAPI Documentation)
 └── feature/docs           (Documentation Suite & Postman Collection)
```

---

## 2. Step-by-Step Feature Workflow

### Step 1: Create a Feature Branch from `main`
```bash
# Ensure local main is up to date
git checkout main
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/approval-api
```

### Step 2: Implement and Commit Incremental Changes
Follow Conventional Commits guidelines (`feat`, `fix`, `docs`, `test`, `refactor`).

```bash
# Stage modified files
git add src/controllers/approval.controller.js src/routes/approval.routes.js

# Commit changes
git commit -m "feat(approval): implement filtering, pagination, and sorting for list approvals"
```

### Step 3: Push Feature Branch to Remote
```bash
git push -u origin feature/approval-api
```

### Step 4: Open a Pull Request (PR) & Peer Review
1. Open Pull Request on GitHub targeting `main`.
2. Ensure all automated tests (Jest + Supertest) pass cleanly.
3. Obtain approval from senior lead / reviewer.

### Step 5: Merge into `main` and Cleanup
```bash
# Checkout main and merge feature branch
git checkout main
git merge feature/approval-api --no-ff

# Push updated main
git push origin main

# Delete local and remote feature branch
git branch -d feature/approval-api
git push origin --delete feature/approval-api
```

---

## 3. Recommended Project Commit Timeline

Below is the structured commit timeline representing gradual development of this project:

```text
commit 1: feat(setup): initial project setup with express, env config, and package.json
commit 2: feat(auth): implement mock users, bcrypt hashing, and POST /auth/login with JWT
commit 3: feat(middleware): add logger, auth verification, and role authorization middlewares
commit 4: feat(approvals): implement approvals data array, CRUD endpoints, and access controls
commit 5: feat(query): add status filtering, title/description searching, pagination, and sorting
commit 6: docs(swagger): integrate swagger-jsdoc and swagger-ui-express at /api-docs
commit 7: test(jest): add unit/integration test suite using jest and supertest
commit 8: docs(markdown): add architectural markdown documentation suite in docs/
commit 9: feat(postman): export ready-to-use postman collection with auto-JWT environment token
```
