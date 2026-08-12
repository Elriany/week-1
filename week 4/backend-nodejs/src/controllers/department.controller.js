const departmentService = require('../services/department.service');
const { sendSuccess, sendPaginated } = require('../utils/response.util');
const MSG = require('../constants/messages');
const HTTP = require('../constants/httpStatus');

const departmentController = {
  async getAll(req, res, next) {
    try {
      const { items, pagination } = await departmentService.getAll(req.query);
      return sendPaginated(res, MSG.FETCHED, items, pagination);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const dept = await departmentService.getById(parseInt(req.params.id));
      return sendSuccess(res, MSG.FETCHED, dept);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const dept = await departmentService.create(req.body);
      return sendSuccess(res, MSG.DEPARTMENT_CREATED, dept, HTTP.CREATED);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const dept = await departmentService.update(parseInt(req.params.id), req.body);
      return sendSuccess(res, MSG.DEPARTMENT_UPDATED, dept);
    } catch (err) { next(err); }
  },
};

module.exports = departmentController;
