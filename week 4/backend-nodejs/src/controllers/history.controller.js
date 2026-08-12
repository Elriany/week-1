const historyService = require('../services/history.service');
const { sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');

const historyController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await historyService.getAll(req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },
};

module.exports = historyController;
