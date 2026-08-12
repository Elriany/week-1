const { query } = require('./dbQuery');
const logger = require('../utils/logger.util');
const env = require('./environment');

async function getPool() {
  try {
    const res = query("SELECT DB_NAME() AS dbName, SUSER_SNAME() AS dbUser");
    const currentDb = res[0]?.dbName || env.DB_DATABASE;
    const currentUser = res[0]?.dbUser || 'Windows User';
    logger.info(`Connected to SQL Server [${env.DB_SERVER}/${currentDb}] via Windows Authentication (${currentUser})`);
    return true;
  } catch (err) {
    logger.error('Failed to verify SQL Server connection', { error: err.message });
    throw err;
  }
}

async function closePool() {
  logger.info('SQL Server connection pool closed.');
}

module.exports = { getPool, closePool, query };
