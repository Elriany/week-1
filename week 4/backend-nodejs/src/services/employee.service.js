const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/user.repository');
const deptRepo = require('../repositories/department.repository');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const ROLES = require('../constants/roles');

const employeeService = {
  async getAll(user, query) {
    if (user.role === ROLES.ADMIN) {
      const { items, total } = await userRepo.findAllEmployees(query);
      return {
        items,
        pagination: {
          page: parseInt(query.page) || 1,
          pageSize: parseInt(query.pageSize) || 10,
          totalItems: total,
          totalPages: Math.ceil(total / (parseInt(query.pageSize) || 10)),
        },
      };
    }

    // Manager — own department only
    const { items, total } = await userRepo.findByDepartment(user.departmentId, query);
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

  async getById(id, user) {
    const employee = await userRepo.findById(id);
    if (!employee) throw new AppError(MSG.EMPLOYEE_NOT_FOUND, HTTP.NOT_FOUND);

    // Manager can only see employees in their department
    if (user.role === ROLES.MANAGER && employee.departmentId !== user.departmentId) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    return employee;
  },

  async create(data, user) {
    // Manager can only add employees to their own department
    if (user.role === ROLES.MANAGER) {
      const dept = await deptRepo.findById(user.departmentId);
      if (!dept || !dept.isActive) {
        throw new AppError(MSG.DEPARTMENT_INACTIVE, HTTP.BAD_REQUEST);
      }
      data.departmentId = user.departmentId;
    }

    if (await userRepo.emailExists(data.email)) {
      throw new AppError(MSG.EMAIL_EXISTS, HTTP.CONFLICT);
    }

    const employeeNumber = await userRepo.getNextEmployeeNumber();
    const roleId = await userRepo.getRoleId(ROLES.EMPLOYEE);
    const passwordHash = await bcrypt.hash(data.password || 'Password123!', 10);

    return userRepo.create({
      employeeNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      roleId,
      departmentId: data.departmentId,
      status: data.status || 'PENDING_ACTIVATION',
    });
  },
};

module.exports = employeeService;
