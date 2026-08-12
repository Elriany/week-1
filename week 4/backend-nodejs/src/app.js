const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/environment');
const apiRoutes = require('./routes/index');
const correlationIdMiddleware = require('./middleware/correlationId.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/error.middleware');
const { sendError } = require('./utils/response.util');
const HTTP = require('./constants/httpStatus');

const app = express();

// ─── Security ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));

// ─── Tracing & Logging ──────────────────────────────────────────────
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);

// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Swagger UI ──────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ApprovalFlow API Docs',
}));

// ─── Root redirect to Swagger ────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/api-docs'));

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found.`, null, HTTP.NOT_FOUND);
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
