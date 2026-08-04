const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger.util');

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 Approval Management API Server Running`);
  logger.info(`🌐 Base API URL:    http://localhost:${PORT}/api/v1`);
  logger.info(`🩺 Health Check:   http://localhost:${PORT}/api/v1/health`);
  logger.info(`📚 Swagger Docs:    http://localhost:${PORT}/api-docs`);
  logger.info(`=======================================================`);
});
