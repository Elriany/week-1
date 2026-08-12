require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // Database
  DB_SERVER: process.env.DB_SERVER || 'localhost',
  DB_DATABASE: process.env.DB_DATABASE || 'ApprovalWorkflowSystem',
  DB_TRUSTED_CONNECTION: process.env.DB_TRUSTED_CONNECTION === 'true',
  DB_TRUST_SERVER_CERTIFICATE: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  DB_ENCRYPT: process.env.DB_ENCRYPT === 'true',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  // CORS
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  // API
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',
};

module.exports = env;
