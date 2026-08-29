import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { correlationId } from './common/middleware/correlationId';
import { requestLogger } from './common/middleware/requestLogger';
import { notFound } from './common/middleware/notFound';
import { errorHandler } from './common/middleware/errorHandler';
import { AppError } from './common/errors/AppError';
import v1 from './routes/v1';

const app = express();

// 1. Helmet for security
app.use(helmet());

// 2. CORS
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

// 3. Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Correlation ID
app.use(correlationId);

// 5. Request logging
app.use(requestLogger);

// 6. Rate limiting on /api.
// express-rate-limit sends its own plain-text body by default, which would be
// the one response in the API that escapes the standard error envelope.
const limitHandler: express.RequestHandler = (_req, _res, next) =>
  next(new AppError(429, 'Too many requests, please try again later', 'RATE_LIMITED'));

// Throttling is a production concern. The integration suite signs in several
// times per file from one address and would otherwise exhaust the login budget
// mid-run, failing tests that have nothing to do with rate limiting.
const skipInTests = () => env.NODE_ENV === 'test';

// Broad limit: bounds abuse without interfering with a normal session. One
// screen can issue a dozen calls and the Vite dev proxy makes every client
// share a single IP, so the previous 100/15min ran out mid-session.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  handler: limitHandler,
  skip: skipInTests,
});
app.use('/api', apiLimiter);

// Sign-in is the endpoint where a low ceiling is actually protective. This has
// to be registered before the v1 router below, or it never runs.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: limitHandler,
  skip: skipInTests,
});
app.use('/api/v1/auth/login', loginLimiter);

// 7. Swagger UI (development only)
if (env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}

// Version-agnostic liveness check
app.get('/health', (_req, res) => {
  res.json({ status: 'up' });
});

// 8. API v1 routes
app.use('/api/v1', v1);

// 9. Not found handler
app.use(notFound);

// 10. Error handler — MUST be last and declare 4 parameters
app.use(errorHandler);

// Both forms are exported deliberately: `server.ts` imports the default, and the
// integration suites import `{ app }`. Removing either breaks one of them.
export { app };
export default app;
