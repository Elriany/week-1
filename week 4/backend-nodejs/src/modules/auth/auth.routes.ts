import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/authenticate';
import { authController } from './auth.controller';
import { loginSchema, refreshSchema } from './auth.schemas';

const router = Router();

/**
 * Credential endpoints get a tighter limit than the global /api limiter:
 * 10 attempts per 15 minutes per IP, to blunt password guessing.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Skipped only under test, where suites make many deliberate login attempts.
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Access and refresh tokens with the user profile
 *       401:
 *         description: Invalid credentials or deactivated account
 *       429:
 *         description: Too many attempts
 */
router.post('/login', credentialLimiter, validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new token pair
 *     responses:
 *       200: { description: New access and refresh tokens }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', credentialLimiter, validate({ body: refreshSchema }), authController.refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current authenticated user and effective permissions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user }
 *       401: { description: Missing, invalid, or expired token }
 */
router.get('/me', authenticate, authController.me);

export default router;
