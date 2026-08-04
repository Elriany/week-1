const bcrypt = require('bcryptjs');
const users = require('../data/users.data');
const { generateToken } = require('../utils/jwt.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Handles User Login
 * POST /api/v1/auth/login
 */
const login = (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return sendError(
      res,
      MESSAGES.LOGIN_FAILED,
      [{ field: 'email', message: 'User with provided email does not exist.' }],
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return sendError(
      res,
      MESSAGES.LOGIN_FAILED,
      [{ field: 'password', message: 'Password is incorrect.' }],
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(tokenPayload);

  const userWithoutPassword = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  return sendSuccess(
    res,
    MESSAGES.LOGIN_SUCCESS,
    {
      token,
      tokenType: 'Bearer',
      user: userWithoutPassword,
    },
    HTTP_STATUS.OK
  );
};

module.exports = {
  login,
};
