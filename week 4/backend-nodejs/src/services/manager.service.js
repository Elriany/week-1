const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/user.repository');
const deptRepo = require('../repositories/department.repository');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const ROLES = require('../constants/roles');

const managerService = {
  async getAll(query) {
    const { items, total } = await userRepo.findAllManagers(query);
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

  async create(data) {
    if (await userRepo.emailExists(data.email)) {
      throw new AppError(MSG.EMAIL_EXISTS, HTTP.CONFLICT);
    }

    const employeeNumber = await userRepo.getNextEmployeeNumber();
    const roleId = await userRepo.getRoleId(ROLES.MANAGER);
    const passwordHash = await bcrypt.hash(data.password || 'Password123!', 10);

    const manager = await userRepo.create({
      employeeNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      roleId,
      departmentId: data.departmentId || null,
      status: 'ACTIVE',
    });

    // If departmentId provided, assign manager to department
    if (data.departmentId) {
      const dept = await deptRepo.findById(data.departmentId);
      if (dept) {
        if (dept.managerId) {
          throw new AppError('This department already has a manager assigned.', HTTP.CONFLICT);
        }
        await deptRepo.update(data.departmentId, { managerId: manager.id });
      }
    }

    return manager;
  },

  async update(id, data) {
    const existing = await userRepo.findById(id);
    if (!existing || existing.roleName !== ROLES.MANAGER) {
      throw new AppError(MSG.MANAGER_NOT_FOUND, HTTP.NOT_FOUND);
    }

    if (data.email && data.email !== existing.email) {
      if (await userRepo.emailExists(data.email, id)) {
        throw new AppError(MSG.EMAIL_EXISTS, HTTP.CONFLICT);
      }
    }

    // Handle department reassignment
    if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) {
      // Remove from old department
      if (existing.departmentId) {
        const oldDept = await deptRepo.findById(existing.departmentId);
        if (oldDept && oldDept.managerId === id) {
          await deptRepo.update(existing.departmentId, { managerId: null });
        }
      }
      // Assign to new department
      if (data.departmentId) {
        if (await deptRepo.isManagerAssigned(id, data.departmentId)) {
          // Already handled — manager is being reassigned
        }
        await deptRepo.update(data.departmentId, { managerId: id });
      }
    }

    return userRepo.update(id, data);
  },
};

module.exports = managerService;
