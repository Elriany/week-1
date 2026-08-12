const historyRepo = require('../repositories/history.repository');
const requestRepo = require('../repositories/request.repository');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const ROLES = require('../constants/roles');

const historyService = {
  async getByRequestId(requestId, user) {
    const request = await requestRepo.findById(requestId);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    // Authorization
    if (user.role === ROLES.EMPLOYEE && request.requesterId !== user.id) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (user.role === ROLES.MANAGER) {
      const isOwn = request.requesterId === user.id;
      const isInDept = request.requesterDepartmentId === user.departmentId && request.requesterRole === ROLES.EMPLOYEE;
      if (!isOwn && !isInDept) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    return historyRepo.findByRequestId(requestId);
  },

  async getAll(query) {
    const { items, total } = await historyRepo.findAll(query);
    return {
      items,
      pagination: {
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 20,
        totalItems: total,
        totalPages: Math.ceil(total / (parseInt(query.pageSize) || 20)),
      },
    };
  },
};

module.exports = historyService;
