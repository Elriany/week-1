# customer-management — plan overview

Entry point for the **customer-management** feature. Stories execute in order by their `NN` prefix.

Covers Azure DevOps work item **17 — US03 Customer Management & Customer 360**. The work item's nine implementation tasks are split across three stories so each one is independently shippable and verifiable.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 08 | [08-story-customer-crud-and-search-17.md](08-story-customer-crud-and-search-17.md) | Customer CRUD & Search | 17 | Story 07 (auth, permissions, branch scoping) |
| 09 | [09-story-customer-contacts-notes-and-profile-17.md](09-story-customer-contacts-notes-and-profile-17.md) | Customer Contacts, Notes & Profile Screen | 17 | Story 08 |
| 10 | [10-story-customer-attachments-and-interaction-history-17.md](10-story-customer-attachments-and-interaction-history-17.md) | Customer Attachments & Interaction History (Customer 360) | 17 | Story 09 |

## Work item task coverage

| Work item task | Story |
|---|---|
| 1. Customer and contact data model | 08 (customer) + 09 (contact) |
| 2. Customer CRUD APIs | 08 |
| 3. Customer search and filtering | 08 |
| 4. Customer notes and attachments | 09 (notes) + 10 (attachments) |
| 5. Customer interaction history | 10 |
| 6. Customer list and search screen | 08 |
| 7. Customer profile/details screen | 09 |
| 8. Notes and attachment UI | 09 (notes) + 10 (attachments) |
| 9. Test customer CRUD, search and ticket relationship | 08 (CRUD, search) + 10 (ticket relationship) |

## Dependency notes

- **The `Customers` table already exists.** Story 02's migration `1724086800000-InitialCrmSchema.ts` created it (~lines 78–96), and `backend-nodejs/src/modules/customers/customer.entity.ts` is already mapped to it. Story 08 **extends** that table with `isActive`; it does not recreate it.
- **`Tickets.customerId` already references `Customers.id`** (`ticket.entity.ts` ~lines 37–42, indexed on line 14). No ticket schema change is required anywhere in this feature — Story 10 only reads the relationship.
- **Permission codes are introduced once, in Story 08** (`customers.read`, `customers.create`, `customers.update`, `customers.delete`). Stories 09 and 10 deliberately add none: contacts, notes, attachments, and history all reuse `customers.read` / `customers.update`. Any edit to `permissions.constants.ts` requires re-running `npm run db:seed`.
- **Branch scoping is inherited, not re-invented.** Story 08 copies the `isUnscoped()` rule from `users.controller.ts`; Story 09 factors it into `requireCustomerInScope()`; Story 10 reuses that helper unchanged.
- **Story 09 leaves a marked placeholder** in `CustomerDetailView.vue` that Story 10 fills, so the final story appends rather than restructures.
- **Story 10 is the only story that adds a runtime dependency** (`multer`) and the only one that writes to the filesystem. Its migration is also the only one whose rollback leaves orphaned data — files on disk outlive the metadata table.
- Migration timestamps are pre-assigned and must stay ordered: `1757000000000` (08) → `1758000000000` (09) → `1759000000000` (10).
