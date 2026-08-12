const commentRepo = require('../repositories/comment.repository');
const requestRepo = require('../repositories/request.repository');
const historyRepo = require('../repositories/history.repository');
const AppError = require('../utils/appError.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');
const ROLES = require('../constants/roles');

const commentService = {
  async getByRequestId(requestId, user) {
    // Authorization: verify user can access this request first
    const request = await requestRepo.findById(requestId);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    if (user.role === ROLES.EMPLOYEE && request.requesterId !== user.id) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (user.role === ROLES.MANAGER) {
      const isOwn = request.requesterId === user.id;
      const isInDept = request.requesterDepartmentId === user.departmentId && request.requesterRole === ROLES.EMPLOYEE;
      if (!isOwn && !isInDept) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    return commentRepo.findByRequestId(requestId);
  },

  async create(requestId, user, commentText) {
    const request = await requestRepo.findById(requestId);
    if (!request) throw new AppError(MSG.REQUEST_NOT_FOUND, HTTP.NOT_FOUND);

    // Authorization: same as above
    if (user.role === ROLES.EMPLOYEE && request.requesterId !== user.id) {
      throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }
    if (user.role === ROLES.MANAGER) {
      const isOwn = request.requesterId === user.id;
      const isInDept = request.requesterDepartmentId === user.departmentId && request.requesterRole === ROLES.EMPLOYEE;
      if (!isOwn && !isInDept) throw new AppError(MSG.FORBIDDEN, HTTP.FORBIDDEN);
    }

    const comment = await commentRepo.create({
      requestId,
      authorId: user.id,
      comment: commentText,
    });

    // Record in history
    await historyRepo.create({
      requestId,
      action: 'COMMENT_ADDED',
      fromStatus: request.status,
      toStatus: request.status,
      performedBy: user.id,
      comment: commentText,
    });

    return comment;
  },
};

module.exports = commentService;
