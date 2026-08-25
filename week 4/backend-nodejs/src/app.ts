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

// 6. Rate limiting on /api
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

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

export default app;
