const managerService = require('../services/manager.service');
const { sendSuccess, sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');
const HTTP = require('../constants/httpStatus');

const managerController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await managerService.getAll(req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const mgr = await managerService.create(req.body);
      return sendSuccess(res, MSG.MANAGER_CREATED, mgr, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const mgr = await managerService.update(parseInt(req.params.id), req.body);
      return sendSuccess(res, MSG.MANAGER_UPDATED, mgr);
    } catch (err) { next(err); }
  },
};

module.exports = managerController;
