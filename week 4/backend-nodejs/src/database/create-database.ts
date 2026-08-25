import 'reflect-metadata';
import * as msnodesqlv8 from 'mssql/msnodesqlv8';
import { logger } from '../common/utils/logger';
import { env } from '../config/env';

async function createDatabase() {
  const connectionString = [
    `Driver={${env.DB_ODBC_DRIVER}}`,
    `Server=${env.DB_SERVER}`,
    'Database=master',
    'Trusted_Connection=yes',
    `TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no'}`,
  ].join(';') + ';';

  try {
    const pool = new msnodesqlv8.ConnectionPool({
      connectionString,
    });

    await pool.connect();
    logger.info('Connected to SQL Server master database');

    const result = await pool.request().query(`
      IF DB_ID(N'${env.DB_DATABASE}') IS NULL
        CREATE DATABASE [${env.DB_DATABASE}] COLLATE Arabic_CI_AS;
    `);

    await pool.close();
    logger.info(`Database '${env.DB_DATABASE}' is ready (created or already exists with Arabic_CI_AS collation)`);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Failed to create database', { error: err.message });
    }
    process.exit(1);
  }
}

createDatabase();
