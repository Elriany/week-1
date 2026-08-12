module.exports = {
  // Auth
  LOGIN_SUCCESS: 'Login successful.',
  LOGIN_FAILED: 'Invalid email or password.',
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  TOKEN_EXPIRED: 'Session expired. Please log in again.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact an administrator.',

  // Users
  USER_NOT_FOUND: 'User not found.',
  USER_CREATED: 'User created successfully.',
  USER_UPDATED: 'User updated successfully.',
  EMAIL_EXISTS: 'A user with this email already exists.',
  EMPLOYEE_NUMBER_EXISTS: 'An employee with this employee number already exists.',

  // Departments
  DEPARTMENT_NOT_FOUND: 'Department not found.',
  DEPARTMENT_CREATED: 'Department created successfully.',
  DEPARTMENT_UPDATED: 'Department updated successfully.',
  DEPARTMENT_CODE_EXISTS: 'A department with this code already exists.',
  DEPARTMENT_INACTIVE: 'This department is currently inactive.',

  // Managers
  MANAGER_NOT_FOUND: 'Manager not found.',
  MANAGER_CREATED: 'Manager created successfully.',
  MANAGER_UPDATED: 'Manager updated successfully.',
  MANAGER_ALREADY_ASSIGNED: 'This manager is already assigned to a department.',

  // Employees
  EMPLOYEE_NOT_FOUND: 'Employee not found.',
  EMPLOYEE_CREATED: 'Employee added successfully.',
  EMPLOYEE_NOT_IN_DEPARTMENT: 'This employee does not belong to your department.',

  // Requests
  REQUEST_NOT_FOUND: 'Approval request not found.',
  REQUEST_CREATED: 'Approval request created successfully.',
  REQUEST_SUBMITTED: 'Request submitted for review.',
  REQUEST_APPROVED: 'Request approved successfully.',
  REQUEST_REJECTED: 'Request rejected.',
  REQUEST_RESUBMITTED: 'Request resubmitted for review.',
  REQUEST_CANCELLED: 'Request cancelled.',
  INVALID_STATUS_TRANSITION: 'This status transition is not allowed.',
  REJECTION_COMMENT_REQUIRED: 'A comment is required when rejecting a request.',
  CANNOT_APPROVE_OWN_REQUEST: 'You cannot approve your own request.',

  // Comments
  COMMENT_ADDED: 'Comment added successfully.',
  COMMENT_NOT_FOUND: 'Comment not found.',

  // Status Requests
  STATUS_REQUEST_NOT_FOUND: 'Employee status request not found.',
  STATUS_REQUEST_CREATED: 'Employee status change request submitted.',
  STATUS_REQUEST_APPROVED: 'Employee status change approved.',
  STATUS_REQUEST_REJECTED: 'Employee status change rejected.',
  ACTIVATION_ALREADY_PENDING: 'An activation request is already pending for this employee.',
  DEACTIVATION_ALREADY_PENDING: 'A deactivation request is already pending for this employee.',
  EMPLOYEE_ALREADY_ACTIVE: 'Employee is already active.',
  EMPLOYEE_ALREADY_INACTIVE: 'Employee is already inactive.',

  // General
  VALIDATION_ERROR: 'Validation failed.',
  NOT_FOUND: 'Resource not found.',
  INTERNAL_ERROR: 'An internal server error occurred.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  HEALTH_OK: 'Approval Workflow API is running.',
  FETCHED: 'Data retrieved successfully.',
};
