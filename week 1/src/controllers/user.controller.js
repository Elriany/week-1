const users = require('../data/users.data');
const { sendSuccess, sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const ROLES = require('../constants/roles');

/**
 * Sanitizes user object by removing password
 */
const sanitizeUser = (user) => {
  const userCopy = { ...user };
  delete userCopy.password;
  return userCopy;
};

/**
 * Get all users
 * GET /api/v1/users
 */
const getAllUsers = (req, res) => {
  const sanitizedUsers = users.map(sanitizeUser);
  return sendSuccess(res, MESSAGES.USERS_RETRIEVED, sanitizedUsers, HTTP_STATUS.OK);
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUserById = (req, res) => {
  const { id } = req.params;

  if (req.user.role === ROLES.EMPLOYEE && req.user.id !== id) {
    return sendError(
      res,
      'Access denied. Employees can only view their own user profile.',
      [{ field: 'id', message: 'You are not authorized to view this user account.' }],
      HTTP_STATUS.FORBIDDEN
    );
  }

  const user = users.find((u) => u.id === id);

  if (!user) {
    return sendError(res, `User with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  return sendSuccess(res, MESSAGES.USER_RETRIEVED, sanitizeUser(user), HTTP_STATUS.OK);
};

module.exports = {
  getAllUsers,
  getUserById,
};
