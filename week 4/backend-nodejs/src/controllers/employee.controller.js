const employeeService = require('../services/employee.service');
const statusRequestService = require('../services/statusRequest.service');
const { sendSuccess, sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');
const HTTP = require('../constants/httpStatus');

const employeeController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await employeeService.getAll(req.user, req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const emp = await employeeService.getById(parseInt(req.params.id), req.user);
      return sendSuccess(res, MSG.FETCHED, emp);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const emp = await employeeService.create(req.body, req.user);
      return sendSuccess(res, MSG.EMPLOYEE_CREATED, emp, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  async requestActivation(req, res, next) {
    try {
      const result = await statusRequestService.requestActivation(
        parseInt(req.params.id), req.user, req.body.reason
      );
      return sendSuccess(res, MSG.STATUS_REQUEST_CREATED, result, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  async requestDeactivation(req, res, next) {
    try {
      const result = await statusRequestService.requestDeactivation(
        parseInt(req.params.id), req.user, req.body.reason
      );
      return sendSuccess(res, MSG.STATUS_REQUEST_CREATED, result, HTTP.CREATED);
    } catch (err) { next(err); }
  },
};

module.exports = employeeController;
