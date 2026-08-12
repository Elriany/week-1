const requestService = require('../services/request.service');
const commentService = require('../services/comment.service');
const historyService = require('../services/history.service');
const { sendSuccess, sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');
const HTTP = require('../constants/httpStatus');

const requestController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await requestService.getAll(req.user, req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const request = await requestService.getById(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.FETCHED, request);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const request = await requestService.create(req.body, req.user);
      return sendSuccess(res, MSG.REQUEST_CREATED, request, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  async submit(req, res, next) {
    try {
      const request = await requestService.submit(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.REQUEST_SUBMITTED, request);
    } catch (err) { next(err); }
  },

  async approve(req, res, next) {
    try {
      const request = await requestService.approve(parseInt(req.params.id), req.user, req.body.comment);
      return sendSuccess(res, MSG.REQUEST_APPROVED, request);
    } catch (err) { next(err); }
  },

  async reject(req, res, next) {
    try {
      const request = await requestService.reject(parseInt(req.params.id), req.user, req.body.comment);
      return sendSuccess(res, MSG.REQUEST_REJECTED, request);
    } catch (err) { next(err); }
  },

  async resubmit(req, res, next) {
    try {
      const request = await requestService.resubmit(parseInt(req.params.id), req.user, req.body);
      return sendSuccess(res, MSG.REQUEST_RESUBMITTED, request);
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      const request = await requestService.cancel(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.REQUEST_CANCELLED, request);
    } catch (err) { next(err); }
  },

  // Comments
  async getComments(req, res, next) {
    try {
      const comments = await commentService.getByRequestId(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.FETCHED, comments);
    } catch (err) { next(err); }
  },

  async addComment(req, res, next) {
    try {
      const comment = await commentService.create(parseInt(req.params.id), req.user, req.body.comment);
      return sendSuccess(res, MSG.COMMENT_ADDED, comment, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  // History
  async getHistory(req, res, next) {
    try {
      const history = await historyService.getByRequestId(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.FETCHED, history);
    } catch (err) { next(err); }
  },
};

module.exports = requestController;
