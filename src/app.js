const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger.config');
const apiRoutes = require('./routes/index');
const correlationIdMiddleware = require('./middleware/correlationId.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const apiLimiter = require('./middleware/rateLimit.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Correlation Tracing & Logger Middlewares
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);

// Global Rate Limiting (100 req/min)
app.use(apiLimiter);

// Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger OpenAPI UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Endpoint Redirect to Documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// API Routes Mounted under /api/v1
app.use('/api/v1', apiRoutes);

// Unmatched Route (404) Handler
app.use(notFoundHandler);

// Global Error Handler (500)
app.use(errorHandler);

module.exports = app;
