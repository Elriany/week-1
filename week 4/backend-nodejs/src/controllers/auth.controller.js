const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response.util');
const MSG = require('../constants/messages');
const HTTP = require('../constants/httpStatus');

const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      return sendSuccess(res, MSG.LOGIN_SUCCESS, data, HTTP.OK);
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return sendSuccess(res, MSG.FETCHED, user);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
