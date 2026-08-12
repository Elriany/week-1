const deptRepo = require('../repositories/department.repository');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

const departmentService = {
  async getAll(query) {
    const { items, total } = await deptRepo.findAll(query);
    return {
      items,
      pagination: {
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 10,
        totalItems: total,
        totalPages: Math.ceil(total / (parseInt(query.pageSize) || 10)),
      },
    };
  },

  async getById(id) {
    const dept = await deptRepo.findById(id);
    if (!dept) throw new AppError(MSG.DEPARTMENT_NOT_FOUND, HTTP.NOT_FOUND);
    return dept;
  },

  async create(data) {
    if (await deptRepo.codeExists(data.code)) {
      throw new AppError(MSG.DEPARTMENT_CODE_EXISTS, HTTP.CONFLICT);
    }
    return deptRepo.create(data);
  },

  async update(id, data) {
    const existing = await deptRepo.findById(id);
    if (!existing) throw new AppError(MSG.DEPARTMENT_NOT_FOUND, HTTP.NOT_FOUND);

    if (data.code && data.code !== existing.code) {
      if (await deptRepo.codeExists(data.code, id)) {
        throw new AppError(MSG.DEPARTMENT_CODE_EXISTS, HTTP.CONFLICT);
      }
    }

    // If assigning a new manager, check they aren't already assigned elsewhere
    if (data.managerId && data.managerId !== existing.managerId) {
      if (await deptRepo.isManagerAssigned(data.managerId, id)) {
        throw new AppError(MSG.MANAGER_ALREADY_ASSIGNED, HTTP.CONFLICT);
      }
    }

    return deptRepo.update(id, data);
  },
};

module.exports = departmentService;
