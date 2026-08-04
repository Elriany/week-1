/**
 * Application Standard Response Messages Constant
 */
const MESSAGES = Object.freeze({
  HEALTH_OK: 'Approval Management API is up and running healthy.',
  LOGIN_SUCCESS: 'Login successful. Authentication token generated.',
  LOGIN_FAILED: 'Invalid email or password credentials.',
  UNAUTHORIZED: 'Access denied. Authentication token is missing or invalid.',
  FORBIDDEN: 'Forbidden: You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Validation failed. Please check your request input.',
  TOO_MANY_REQUESTS: 'Too many requests from this IP, please try again after 15 minutes.',
  INTERNAL_ERROR: 'Internal server error occurred.',
  APPROVAL_CREATED: 'Approval request created successfully.',
  APPROVAL_UPDATED: 'Approval request updated successfully.',
  APPROVAL_DELETED: 'Approval request deleted successfully.',
  APPROVAL_APPROVED: 'Approval request has been approved.',
  APPROVAL_REJECTED: 'Approval request has been rejected.',
  USERS_RETRIEVED: 'Users retrieved successfully.',
  USER_RETRIEVED: 'User retrieved successfully.',
  APPROVALS_RETRIEVED: 'Approval requests retrieved successfully.',
});

module.exports = MESSAGES;
