const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const authController = require('../controllers/auth.controller');
const historyController = require('../controllers/history.controller');
const { sendSuccess } = require('../utils/response.util');
const MSG = require('../constants/messages');

// Health check — public
router.get('/health', (req, res) => sendSuccess(res, MSG.HEALTH_OK));

// Auth — public
router.use('/auth', require('./auth.routes'));

// All routes below require authentication
router.use(authenticate);

// Current user
router.get('/auth/me', authController.me);

// Dashboard
router.use('/dashboard', require('./dashboard.routes'));

// Departments
router.use('/departments', require('./department.routes'));

// Managers
router.use('/managers', require('./manager.routes'));

// Employees
router.use('/employees', require('./employee.routes'));

// Approval Requests
router.use('/requests', require('./request.routes'));

// Employee Status Requests
router.use('/status-requests', require('./statusRequest.routes'));

// Audit History — admin only
router.get('/audit/history', authorizeRoles('ADMIN'), historyController.getAll);

module.exports = router;
