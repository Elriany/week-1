const dotenv = require('dotenv');
const CONFIG_CONSTANTS = require('./constants');

// Load environment variables from .env file
dotenv.config();

/**
 * Validates mandatory environment variables.
 * Application will fail fast on server initialization if required variables are absent.
 */
const validateEnv = () => {
  const requiredEnvVars = ['JWT_SECRET'];
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    const errorMsg = `[FATAL] Missing required environment variables: ${missing.join(', ')}. Please check your .env configuration.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

// Execute environment validation
validateEnv();

const config = {
  port: parseInt(process.env.PORT, 10) || CONFIG_CONSTANTS.DEFAULT_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || CONFIG_CONSTANTS.DEFAULT_JWT_EXPIRES_IN,
  apiPrefix: CONFIG_CONSTANTS.API_PREFIX,
  apiVersion: CONFIG_CONSTANTS.API_VERSION,
  fullApiBase: CONFIG_CONSTANTS.FULL_API_BASE,
};

module.exports = config;
