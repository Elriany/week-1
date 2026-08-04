const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const approvalRoutes = require('./approval.routes');
const { sendSuccess } = require('../utils/response.util');

const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/v1/health
 */
router.get('/health', (req, res) => {
  return sendSuccess(
    res,
    'Approval Management API is up and running healthy.',
    {
      status: 'UP',
      uptime: `${process.uptime().toFixed(2)}s`,
      timestamp: new Date().toISOString(),
    },
    200
  );
});

// Register Sub-Routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/approvals', approvalRoutes);

module.exports = router;
