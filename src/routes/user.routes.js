const express = require('express');
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   GET /api/v1/users
 * @desc    Get list of all users
 * @access  Protected (Admin, Manager)
 */
router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user details by ID
 * @access  Protected (Admin, Manager, or Employee viewing self)
 */
router.get('/:id', userController.getUserById);

module.exports = router;
