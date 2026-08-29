import type { RequestHandler } from 'express';
import { AppDataSource } from '../../config/data-source';

// Mounted at /api/v1/health, so it carries the same envelope as every other
// versioned endpoint. The bare `{ status: 'up' }` liveness probe stays at
// /health in app.ts, where load balancers expect a minimal body.
const check: RequestHandler = (req, res) => {
  res.json({ success: true, data: { status: 'up' }, correlationId: req.correlationId });
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
      success: true,
      data: {
        status: 'up',
        dbName: result[0]?.dbName,
        loginName: result[0]?.loginName,
      },
      correlationId: _req.correlationId,
    });
  } catch (err) {
    next(err);
  }
};

export const healthController = { check, checkDatabase };
