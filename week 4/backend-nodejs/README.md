# AZM CRM Backend

Express + TypeScript backend for the AZM Customer Support CRM. See the [root README](../README.md) for setup, architecture overview, and troubleshooting.

---

## Module Layout Convention

Each feature lives in `src/modules/<feature>/` with these files:

```
src/modules/tickets/
  tickets.controller.ts    # Request handlers
  tickets.routes.ts        # Express routes
  tickets.service.ts       # Business logic (optional, if complex)
  entities/
    Ticket.ts              # TypeORM entity
```

---

## Adding a Route

1. Create the handler in `tickets.controller.ts`:
   ```ts
   export const getTickets: RequestHandler = (req, res) => {
     res.json({ success: true, data: [...] });
   };
   ```

2. Wire it in `tickets.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { getTickets } from './tickets.controller';

   export const ticketsRoutes = Router()
     .get('/', getTickets);
   ```

3. Mount it in `src/common/routes/v1.ts`:
   ```ts
   import { ticketsRoutes } from '../../modules/tickets/tickets.routes';
   router.use('/tickets', ticketsRoutes);
   ```

---

## Adding a Migration

```bash
# After modifying an entity, generate a migration
npm run migration:generate -- src/database/migrations/AddTicketStatus

# Review the generated file in src/database/migrations/
# Then apply it:
npm run migration:run
```

All migrations must name columns `NVARCHAR` for text (never `VARCHAR`). Migrations are ordered by timestamp and applied sequentially.

---

## Error Handling

Always throw `AppError` subclasses, not plain `Error`:

```ts
import { ValidationError, NotFoundError } from '../../common/errors/AppError';

if (!email) throw new ValidationError({ email: 'required' });
if (!ticket) throw new NotFoundError('Ticket');
```

The error middleware catches them and formats the response according to the envelope from Story 01.

---

## Testing

```bash
npm test              # Unit tests
npm run test:watch   # Watch mode
npm run test:integration  # Integration tests (Windows only)
```

Co-locate tests beside their code: `src/modules/tickets/__tests__/tickets.controller.spec.ts`.

---

## Key Paths

- Config: `src/config/env.ts` (environment variables), `src/config/data-source.ts` (TypeORM)
- Middleware: `src/common/middleware/` (error handling, logging, validation, correlation IDs)
- Routes: `src/common/routes/v1.ts` (the single entry point for all routes)
- Entities: `src/modules/<feature>/entities/`

---

See the [root README](../README.md) for more.
