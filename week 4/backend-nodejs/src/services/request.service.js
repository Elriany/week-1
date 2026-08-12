const requestRepo = require('../repositories/request.repository');
const historyRepo = require('../repositories/history.repository');
const commentRepo = require('../repositories/comment.repository');
const { getPool } = require('../config/database');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const ROLES = require('../constants/roles');
const STATUSES = require('../constants/requestStatuses');
const TYPES = require('../constants/requestTypes');

/**
 * Allowed workflow transitions. Key = current status, value = array of allowed next statuses.
 */
const TRANSITIONS = {
  [STATUSES.DRAFT]:            [STATUSES.PENDING_MANAGER, STATUSES.PENDING_ADMIN, STATUSES.CANCELLED],
  [STATUSES.PENDING_MANAGER]:  [STATUSES.APPROVED, STATUSES.REJECTED, STATUSES.CANCELLED],
  [STATUSES.PENDING_ADMIN]:    [STATUSES.APPROVED, STATUSES.REJECTED, STATUSES.CANCELLED],
  [STATUSES.REJECTED]:         [STATUSES.RESUBMITTED],
  [STATUSES.RESUBMITTED]:      [STATUSES.PENDING_MANAGER, STATUSES.PENDING_ADMIN],
};

function validateTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new AppError(MSG.INVALID_STATUS_TRANSITION, HTTP.CONFLICT);
  }
}

const requestService = {
  async getAll(user, query) {
    const opts = { ...query };

    // Role-based visibility enforcement
    if (user.role === ROLES.EMPLOYEE) {
      opts.requesterId = user.id;
    } else if (user.role === ROLES.MANAGER) {
      opts.departmentId = user.departmentId;
      opts.reviewerId = user.id;
    }
    // ADMIN sees all — no filter applied

    const { items, total } = await requestRepo.findAll(opts);
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
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    // Authorization: Employee can only see own requests
    if (user.role === ROLES.EMPLOYEE && request.requesterId !== user.id) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    // Manager can see own + department employee requests
    if (user.role === ROLES.MANAGER) {
      const isOwn = request.requesterId === user.id;
      const isInDept = request.requesterDepartmentId === user.departmentId && request.requesterRole === ROLES.EMPLOYEE;
      if (!isOwn && !isInDept) {
        throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
      }
    }

    return request;
  },

  async create(data, user) {
    const requestNumber = await requestRepo.getNextRequestNumber();

    let status = STATUSES.DRAFT;
    let type = data.type || TYPES.GENERAL_APPROVAL;

    // If employee, type must be GENERAL_APPROVAL
    if (user.role === ROLES.EMPLOYEE) {
      type = TYPES.GENERAL_APPROVAL;
    }
    // If manager creating a standard request, it's MANAGER_REQUEST
    if (user.role === ROLES.MANAGER && type !== TYPES.EMPLOYEE_ACTIVATION && type !== TYPES.EMPLOYEE_DEACTIVATION) {
      type = TYPES.MANAGER_REQUEST;
    }

    const request = await requestRepo.create({
      requestNumber,
      title: data.title,
      description: data.description,
      type,
      priority: data.priority || 'MEDIUM',
      status,
      requesterId: user.id,
      dueDate: data.dueDate,
    });

    // Create history entry
    await historyRepo.create({
      requestId: request.id,
      action: 'REQUEST_CREATED',
      fromStatus: null,
      toStatus: STATUSES.DRAFT,
      performedBy: user.id,
    });

    return request;
  },

  async submit(id, user) {
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    if (request.requesterId !== user.id) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);

    // Determine the next status based on requester role and request type
    let nextStatus;
    if (request.type === TYPES.MANAGER_REQUEST || request.type === TYPES.EMPLOYEE_ACTIVATION || request.type === TYPES.EMPLOYEE_DEACTIVATION) {
      nextStatus = STATUSES.PENDING_ADMIN;
    } else {
      nextStatus = user.role === ROLES.MANAGER ? STATUSES.PENDING_ADMIN : STATUSES.PENDING_MANAGER;
    }

    validateTransition(request.status, nextStatus);

    const updated = await requestRepo.updateStatus(id, nextStatus);

    await historyRepo.create({
      requestId: id,
      action: 'SUBMITTED',
      fromStatus: request.status,
      toStatus: nextStatus,
      performedBy: user.id,
    });

    return updated;
  },

  async approve(id, user, comment) {
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    if (request.requesterId === user.id) {
      throw new AppError(MSG.CANNOT_APPROVE_OWN_REQUEST, HTTP.FORBIDDEN);
    }

    if (request.status === STATUSES.PENDING_MANAGER && user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (request.status === STATUSES.PENDING_ADMIN && user.role !== ROLES.ADMIN) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (user.role === ROLES.MANAGER && request.requesterDepartmentId !== user.departmentId) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    validateTransition(request.status, STATUSES.APPROVED);

    const { TransactionHelper } = require('../config/dbQuery');
    const tx = new TransactionHelper();

    await requestRepo.updateStatusWithTransaction(tx, id, STATUSES.APPROVED, user.id);

    await historyRepo.createWithTransaction(tx, {
      requestId: id,
      action: 'APPROVED',
      fromStatus: request.status,
      toStatus: STATUSES.APPROVED,
      performedBy: user.id,
      comment: comment || null,
    });

    if (comment) {
      await commentRepo.createWithTransaction(tx, {
        requestId: id,
        authorId: user.id,
        comment,
      });
    }

    tx.commit();
    return requestRepo.findById(id);
  },

  async reject(id, user, comment) {
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    if (!comment || !comment.trim()) {
      throw new AppError(MSG.REJECTION_COMMENT_REQUIRED, HTTP.BAD_REQUEST);
    }

    if (request.requesterId === user.id) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    if (request.status === STATUSES.PENDING_MANAGER && user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (request.status === STATUSES.PENDING_ADMIN && user.role !== ROLES.ADMIN) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (user.role === ROLES.MANAGER && request.requesterDepartmentId !== user.departmentId) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    validateTransition(request.status, STATUSES.REJECTED);

    const { TransactionHelper } = require('../config/dbQuery');
    const tx = new TransactionHelper();

    await requestRepo.updateStatusWithTransaction(tx, id, STATUSES.REJECTED, user.id);

    await historyRepo.createWithTransaction(tx, {
      requestId: id,
      action: 'REJECTED',
      fromStatus: request.status,
      toStatus: STATUSES.REJECTED,
      performedBy: user.id,
      comment,
    });

    await commentRepo.createWithTransaction(tx, {
      requestId: id,
      authorId: user.id,
      comment,
    });

    tx.commit();
    return requestRepo.findById(id);
  },

  async resubmit(id, user, data) {
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    if (request.requesterId !== user.id) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);

    validateTransition(request.status, STATUSES.RESUBMITTED);

    let nextStatus;
    if (request.type === TYPES.MANAGER_REQUEST || request.type === TYPES.EMPLOYEE_ACTIVATION || request.type === TYPES.EMPLOYEE_DEACTIVATION) {
      nextStatus = STATUSES.PENDING_ADMIN;
    } else {
      nextStatus = user.role === ROLES.MANAGER ? STATUSES.PENDING_ADMIN : STATUSES.PENDING_MANAGER;
    }

    const newAttempt = (request.attempt || 1) + 1;

    const { TransactionHelper } = require('../config/dbQuery');
    const tx = new TransactionHelper();

    await requestRepo.updateStatusWithTransaction(tx, id, nextStatus, null, newAttempt);

    await historyRepo.createWithTransaction(tx, {
      requestId: id,
      action: 'RESUBMITTED',
      fromStatus: STATUSES.REJECTED,
      toStatus: nextStatus,
      performedBy: user.id,
      comment: data?.comment || null,
    });

    if (data?.comment) {
      await commentRepo.createWithTransaction(tx, {
        requestId: id,
        authorId: user.id,
        comment: data.comment,
      });
    }

    tx.commit();
    return requestRepo.findById(id);
  },

  async cancel(id, user) {
    const request = await requestRepo.findById(id);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);
    if (request.requesterId !== user.id) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);

    validateTransition(request.status, STATUSES.CANCELLED);

    const updated = await requestRepo.updateStatus(id, STATUSES.CANCELLED);

    await historyRepo.create({
      requestId: id,
      action: 'CANCELLED',
      fromStatus: request.status,
      toStatus: STATUSES.CANCELLED,
      performedBy: user.id,
    });

    return updated;
  },
};

module.exports = requestService;
