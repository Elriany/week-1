const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response.util');
const MSG = require('../constants/messages');

const dashboardController = {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboard(req.user);
      return sendSuccess(res, MSG.FETCHED, data);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
