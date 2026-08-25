import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: up
 */
router.get('/', healthController.check);

/**
 * @openapi
 * /health/db:
 *   get:
 *     tags:
 *       - Health
 *     summary: Database health check
 *     description: Returns the database connection status and information
 *     responses:
 *       200:
 *         description: Database is healthy
 *       503:
 *         description: Database is unavailable
 */
router.get('/db', healthController.checkDatabase);

export default router;
