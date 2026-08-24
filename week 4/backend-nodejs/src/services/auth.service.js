const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/user.repository');
const { generateToken } = require('../utils/jwt.util');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

const authService = {
  async login(email, password) {
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new AppError(MSG.LOGIN_FAILED, HTTP.UNAUTHORIZED);
    }

    // Inactive users cannot log in
    if (user.status === 'INACTIVE') {
      throw new AppError(MSG.ACCOUNT_INACTIVE, HTTP.UNAUTHORIZED);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(MSG.LOGIN_FAILED, HTTP.UNAUTHORIZED);
    }

    const userRole = user.role || user.roleName;

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: userRole,
      departmentId: user.departmentId,
    };

    const accessToken = generateToken(tokenPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        employeeNumber: user.employeeNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: userRole,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
        status: user.status,
      },
    };
  },

  async me(userId) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(MSG.USER_NOT_FOUND, HTTP.NOT_FOUND);
    }

    const userRole = user.role || user.roleName;

    return {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: userRole,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      status: user.status,
    };
  },
};

module.exports = authService;
