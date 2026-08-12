const statusReqRepo = require('../repositories/statusRequest.repository');
const requestRepo = require('../repositories/request.repository');
const historyRepo = require('../repositories/history.repository');
const commentRepo = require('../repositories/comment.repository');
const userRepo = require('../repositories/user.repository');
const { TransactionHelper } = require('../config/dbQuery');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const EMPLOYEE_STATUSES = require('../constants/employeeStatuses');

const statusRequestService = {
  async getAll(query) {
    const { items, total } = await statusReqRepo.findAll(query);
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
    const sr = await statusReqRepo.findById(id);
    if (!sr) throw new AppError(MSG.STATUS_REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    return sr;
  },

  async requestActivation(employeeId, user, reason) {
    const employee = await userRepo.findById(employeeId);
    if (!employee) throw new AppError(MSG.EMPLOYEE_NOT_FOUND, HTTP.NOT_FOUND);
    if (employee.departmentId !== user.departmentId) {
      throw new AppError(MSG.EMPLOYEE_NOT_IN_DEPARTMENT, HTTP.FORBIDDEN);
    }
    if (employee.status === EMPLOYEE_STATUSES.ACTIVE) {
      throw new AppError(MSG.EMPLOYEE_ALREADY_ACTIVE, HTTP.CONFLICT);
    }
    if (await statusReqRepo.hasPendingRequest(employeeId, 'ACTIVATE_EMPLOYEE')) {
      throw new AppError(MSG.ACTIVATION_ALREADY_PENDING, HTTP.CONFLICT);
    }

    const tx = new TransactionHelper();
    const requestNumber = await requestRepo.getNextRequestNumber();

    const approvalReq = await requestRepo.createWithTransaction(tx, {
      requestNumber,
      title: `Employee Activation — ${employee.firstName} ${employee.lastName}`,
      description: reason || `Activation request for ${employee.firstName} ${employee.lastName} (${employee.employeeNumber})`,
      type: 'EMPLOYEE_ACTIVATION',
      priority: 'HIGH',
      status: 'PENDING_ADMIN',
      requesterId: user.id,
      targetEmployeeId: employeeId,
    });

    const statusReq = await statusReqRepo.createWithTransaction(tx, {
      employeeId,
      requestedBy: user.id,
      departmentId: user.departmentId,
      requestType: 'ACTIVATE_EMPLOYEE',
      reason,
      approvalRequestId: approvalReq.id,
    });

    await userRepo.updateStatusWithTransaction(tx, employeeId, EMPLOYEE_STATUSES.PENDING_ACTIVATION);

    await historyRepo.createWithTransaction(tx, {
      requestId: approvalReq.id,
      action: 'ACTIVATION_REQUESTED',
      fromStatus: null,
      toStatus: 'PENDING_ADMIN',
      performedBy: user.id,
      comment: reason || null,
    });

    tx.commit();
    return { statusRequest: statusReq, approvalRequest: approvalReq };
  },

  async requestDeactivation(employeeId, user, reason) {
    const employee = await userRepo.findById(employeeId);
    if (!employee) throw new AppError(MSG.EMPLOYEE_NOT_FOUND, HTTP.NOT_FOUND);
    if (employee.departmentId !== user.departmentId) {
      throw new AppError(MSG.EMPLOYEE_NOT_IN_DEPARTMENT, HTTP.FORBIDDEN);
    }
    if (employee.status === EMPLOYEE_STATUSES.INACTIVE) {
      throw new AppError(MSG.EMPLOYEE_ALREADY_INACTIVE, HTTP.CONFLICT);
    }
    if (await statusReqRepo.hasPendingRequest(employeeId, 'DEACTIVATE_EMPLOYEE')) {
      throw new AppError(MSG.DEACTIVATION_ALREADY_PENDING, HTTP.CONFLICT);
    }

    const tx = new TransactionHelper();
    const requestNumber = await requestRepo.getNextRequestNumber();

    const approvalReq = await requestRepo.createWithTransaction(tx, {
      requestNumber,
      title: `Employee Deactivation — ${employee.firstName} ${employee.lastName}`,
      description: reason || `Deactivation request for ${employee.firstName} ${employee.lastName}`,
      type: 'EMPLOYEE_DEACTIVATION',
      priority: 'MEDIUM',
      status: 'PENDING_ADMIN',
      requesterId: user.id,
      targetEmployeeId: employeeId,
    });

    const statusReq = await statusReqRepo.createWithTransaction(tx, {
      employeeId,
      requestedBy: user.id,
      departmentId: user.departmentId,
      requestType: 'DEACTIVATE_EMPLOYEE',
      reason,
      approvalRequestId: approvalReq.id,
    });

    await userRepo.updateStatusWithTransaction(tx, employeeId, EMPLOYEE_STATUSES.PENDING_DEACTIVATION);

    await historyRepo.createWithTransaction(tx, {
      requestId: approvalReq.id,
      action: 'DEACTIVATION_REQUESTED',
      fromStatus: null,
      toStatus: 'PENDING_ADMIN',
      performedBy: user.id,
      comment: reason || null,
    });

    tx.commit();
    return { statusRequest: statusReq, approvalRequest: approvalReq };
  },

  async approve(statusRequestId, user, comment) {
    const sr = await statusReqRepo.findById(statusRequestId);
    if (!sr) throw new AppError(MSG.STATUS_REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    if (sr.status !== 'PENDING') throw new AppError(MSG.INVALID_STATUS_TRANSITION, HTTP.CONFLICT);

    const newEmployeeStatus = sr.requestType === 'ACTIVATE_EMPLOYEE'
      ? EMPLOYEE_STATUSES.ACTIVE
      : EMPLOYEE_STATUSES.INACTIVE;

    const actionName = sr.requestType === 'ACTIVATE_EMPLOYEE'
      ? 'ACTIVATION_APPROVED'
      : 'DEACTIVATION_APPROVED';

    const tx = new TransactionHelper();

    await statusReqRepo.updateStatusWithTransaction(tx, statusRequestId, 'APPROVED');
    await userRepo.updateStatusWithTransaction(tx, sr.employeeId, newEmployeeStatus);

    if (sr.approvalRequestId) {
      await requestRepo.updateStatusWithTransaction(tx, sr.approvalRequestId, 'APPROVED', user.id);
    }

    await historyRepo.createWithTransaction(tx, {
      requestId: sr.approvalRequestId,
      action: actionName,
      fromStatus: 'PENDING_ADMIN',
      toStatus: 'APPROVED',
      performedBy: user.id,
      comment: comment || null,
    });

    if (comment) {
      await commentRepo.createWithTransaction(tx, {
        requestId: sr.approvalRequestId,
        authorId: user.id,
        comment,
      });
    }

    tx.commit();
    return statusReqRepo.findById(statusRequestId);
  },

  async reject(statusRequestId, user, comment) {
    const sr = await statusReqRepo.findById(statusRequestId);
    if (!sr) throw new AppError(MSG.STATUS_REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    if (sr.status !== 'PENDING') throw new AppError(MSG.INVALID_STATUS_TRANSITION, HTTP.CONFLICT);

    if (!comment || !comment.trim()) {
      throw new AppError(MSG.REJECTION_COMMENT_REQUIRED, HTTP.BAD_REQUEST);
    }

    const actionName = sr.requestType === 'ACTIVATE_EMPLOYEE'
      ? 'ACTIVATION_REJECTED'
      : 'DEACTIVATION_REJECTED';

    const revertStatus = sr.requestType === 'ACTIVATE_EMPLOYEE'
      ? EMPLOYEE_STATUSES.PENDING_ACTIVATION
      : EMPLOYEE_STATUSES.ACTIVE;

    const tx = new TransactionHelper();

    await statusReqRepo.updateStatusWithTransaction(tx, statusRequestId, 'REJECTED');
    await userRepo.updateStatusWithTransaction(tx, sr.employeeId, revertStatus);

    if (sr.approvalRequestId) {
      await requestRepo.updateStatusWithTransaction(tx, sr.approvalRequestId, 'REJECTED', user.id);
    }

    await historyRepo.createWithTransaction(tx, {
      requestId: sr.approvalRequestId,
      action: actionName,
      fromStatus: 'PENDING_ADMIN',
      toStatus: 'REJECTED',
      performedBy: user.id,
      comment,
    });

    await commentRepo.createWithTransaction(tx, {
      requestId: sr.approvalRequestId,
      authorId: user.id,
      comment,
    });

    tx.commit();
    return statusReqRepo.findById(statusRequestId);
  },
};

module.exports = statusRequestService;
