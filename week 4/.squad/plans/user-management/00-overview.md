# user-management — plan overview

Entry point for the **user-management** feature. Stories execute in order by their `NN` prefix.

Covers Azure DevOps work item **16 — Authentication, Users, Roles & Permissions**.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 07 | [07-story-authentication-and-authorization-16.md](07-story-authentication-and-authorization-16.md) | Authentication, Users, Roles & Permissions | 16 | Stories 01–06 (init-project) |

## Dependency notes

- **Every later feature depends on this one.** `authenticate`, `authorize`, the permission catalogue in `backend-nodejs/src/modules/users/permissions.constants.ts`, and the branch-scoping rule in `users.controller.ts` are the patterns the rest of the system copies — see [../customer-management/00-overview.md](../customer-management/00-overview.md).
- **The plan predates the code it planned.** Story 07 was written against an assumed schema; the delivered implementation builds on Story 02's existing `Users`/`Roles` tables with a **single-role foreign key** (`Users.roleId`), not the many-to-many `UserRoles` join table the plan sketched. Read the code, not the plan, when extending roles.
- **Permission codes live in one file.** Adding or changing a code in `permissions.constants.ts` requires re-running `npm run db:seed`, or routes return 403 for a permission that exists only in TypeScript.
