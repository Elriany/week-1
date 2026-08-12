const statusRequestService = require('../services/statusRequest.service');
const { sendSuccess, sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');

const statusRequestController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await statusRequestService.getAll(req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const sr = await statusRequestService.getById(parseInt(req.params.id));
      return sendSuccess(res, MSG.FETCHED, sr);
    } catch (err) { next(err); }
  },

  async approve(req, res, next) {
    try {
      const sr = await statusRequestService.approve(parseInt(req.params.id), req.user, req.body.comment);
      return sendSuccess(res, MSG.STATUS_REQUEST_APPROVED, sr);
    } catch (err) { next(err); }
  },

  async reject(req, res, next) {
    try {
      const sr = await statusRequestService.reject(parseInt(req.params.id), req.user, req.body.comment);
      return sendSuccess(res, MSG.STATUS_REQUEST_REJECTED, sr);
    } catch (err) { next(err); }
  },
};

module.exports = statusRequestController;
