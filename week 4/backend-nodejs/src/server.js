const app = require('./app');
const env = require('./config/environment');
const logger = require('./utils/logger.util');
const { getPool, closePool } = require('./config/database');

async function start() {
  try {
    // Connect to SQL Server on startup
    await getPool();

    app.listen(env.PORT, () => {
      logger.info(`ApprovalFlow API running on http://localhost:${env.PORT}`);
      logger.info(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

start();
