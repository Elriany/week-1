const { v4: uuidv4 } = require('uuid');
const approvals = require('../data/approvals.data');
const { sendSuccess, sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const ROLES = require('../constants/roles');
const APPROVAL_STATUS = require('../constants/approvalStatus');

/**
 * Get approvals list with Filtering, Searching, Sorting, and Pagination.
 * GET /api/v1/approvals
 */
const getAllApprovals = (req, res) => {
  let result = [...approvals];

  // 1. Role Scope Enforcing
  if (req.user.role === ROLES.EMPLOYEE) {
    result = result.filter((item) => item.requesterId === req.user.id);
  } else if (req.query.requesterId) {
    result = result.filter((item) => item.requesterId === req.query.requesterId);
  }

  // 2. Status Filtering
  if (req.query.status) {
    const filterStatus = req.query.status.toUpperCase();
    result = result.filter((item) => item.status.toUpperCase() === filterStatus);
  }

  // 3. Search Query
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    result = result.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
    );
  }

  // 4. Sorting
  const sortKey = req.query.sort || 'createdAt';
  const sortDirection = (req.query.sortDirection || 'desc').toLowerCase();

  result.sort((a, b) => {
    let valA = a[sortKey] || '';
    let valB = b[sortKey] || '';

    if (valA < valB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // 5. Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const totalItems = result.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedApprovals = result.slice(startIndex, startIndex + pageSize);

  return sendSuccess(
    res,
    MESSAGES.APPROVALS_RETRIEVED,
    {
      approvals: paginatedApprovals,
      pagination: {
        total: totalItems,
        page,
        pageSize,
        totalPages,
      },
    },
    HTTP_STATUS.OK
  );
};

/**
 * Get a single approval request by ID
 * GET /api/v1/approvals/:id
 */
const getApprovalById = (req, res) => {
  const { id } = req.params;
  const approval = approvals.find((item) => item.id === id);

  if (!approval) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  if (req.user.role === ROLES.EMPLOYEE && approval.requesterId !== req.user.id) {
    return sendError(
      res,
      'Access denied. You are not authorized to view this approval request.',
      null,
      HTTP_STATUS.FORBIDDEN
    );
  }

  return sendSuccess(res, 'Approval request retrieved successfully.', approval, HTTP_STATUS.OK);
};

/**
 * Create a new approval request
 * POST /api/v1/approvals
 */
const createApproval = (req, res) => {
  const { title, description } = req.body;

  const newApproval = {
    id: uuidv4(),
    title,
    description,
    requesterId: req.user.id,
    status: APPROVAL_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  approvals.push(newApproval);

  return sendSuccess(res, MESSAGES.APPROVAL_CREATED, newApproval, HTTP_STATUS.CREATED);
};

/**
 * Update an existing approval request
 * PUT /api/v1/approvals/:id
 */
const updateApproval = (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const approval = approvals.find((item) => item.id === id);

  if (!approval) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  if (req.user.role === ROLES.EMPLOYEE) {
    if (approval.requesterId !== req.user.id) {
      return sendError(res, 'Forbidden: You can only update your own approval requests.', null, HTTP_STATUS.FORBIDDEN);
    }
    if (approval.status !== APPROVAL_STATUS.PENDING) {
      return sendError(
        res,
        'Forbidden: You can only update approval requests that are currently PENDING.',
        null,
        HTTP_STATUS.FORBIDDEN
      );
    }
  }

  if (title) {
    approval.title = title;
  }
  if (description) {
    approval.description = description;
  }
  approval.updatedAt = new Date().toISOString();

  return sendSuccess(res, MESSAGES.APPROVAL_UPDATED, approval, HTTP_STATUS.OK);
};

/**
 * Delete an approval request
 * DELETE /api/v1/approvals/:id
 */
const deleteApproval = (req, res) => {
  const { id } = req.params;
  const index = approvals.findIndex((item) => item.id === id);

  if (index === -1) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  const approval = approvals[index];

  if (req.user.role === ROLES.EMPLOYEE) {
    if (approval.requesterId !== req.user.id) {
      return sendError(res, 'Forbidden: You can only delete your own approval requests.', null, HTTP_STATUS.FORBIDDEN);
    }
    if (approval.status !== APPROVAL_STATUS.PENDING) {
      return sendError(
        res,
        'Forbidden: You can only delete approval requests that are currently PENDING.',
        null,
        HTTP_STATUS.FORBIDDEN
      );
    }
  } else if (req.user.role !== ROLES.ADMIN) {
    return sendError(res, 'Forbidden: Only Admins or request owners can delete requests.', null, HTTP_STATUS.FORBIDDEN);
  }

  const deletedApproval = approvals.splice(index, 1)[0];

  return sendSuccess(res, MESSAGES.APPROVAL_DELETED, deletedApproval, HTTP_STATUS.OK);
};

/**
 * Approve an approval request
 * POST /api/v1/approvals/:id/approve
 */
const approveApproval = (req, res) => {
  const { id } = req.params;
  const approval = approvals.find((item) => item.id === id);

  if (!approval) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  approval.status = APPROVAL_STATUS.APPROVED;
  approval.updatedAt = new Date().toISOString();

  return sendSuccess(res, MESSAGES.APPROVAL_APPROVED, approval, HTTP_STATUS.OK);
};

/**
 * Reject an approval request
 * POST /api/v1/approvals/:id/reject
 */
const rejectApproval = (req, res) => {
  const { id } = req.params;
  const approval = approvals.find((item) => item.id === id);

  if (!approval) {
    return sendError(res, `Approval request with ID '${id}' not found.`, null, HTTP_STATUS.NOT_FOUND);
  }

  approval.status = APPROVAL_STATUS.REJECTED;
  approval.updatedAt = new Date().toISOString();

  return sendSuccess(res, MESSAGES.APPROVAL_REJECTED, approval, HTTP_STATUS.OK);
};

module.exports = {
  getAllApprovals,
  getApprovalById,
  createApproval,
  updateApproval,
  deleteApproval,
  approveApproval,
  rejectApproval,
};
