import type { RequestHandler } from 'express';
import { AppDataSource } from '../../config/data-source';

const check: RequestHandler = (_req, res) => {
  res.json({ status: 'up' });
};

const checkDatabase: RequestHandler = async (_req, res, next) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database not initialized',
        },
        correlationId: _req.correlationId,
      });
    }

    const result = await AppDataSource.query(`
      SELECT DB_NAME() AS dbName, SUSER_SNAME() AS loginName
    `);

    res.json({
      status: 'up',
      dbName: result[0]?.dbName,
      loginName: result[0]?.loginName,
    });
  } catch (err) {
    next(err);
  }
};

export const healthController = { check, checkDatabase };
