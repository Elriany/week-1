const { body } = require('express-validator');

const createRequestValidator = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
  body('type').optional().isIn(['GENERAL_APPROVAL', 'MANAGER_REQUEST', 'EMPLOYEE_ACTIVATION', 'EMPLOYEE_DEACTIVATION']).withMessage('Invalid request type.'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority.'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid ISO date.'),
];

const resubmitRequestValidator = [
  body('comment').optional().isLength({ max: 2000 }),
];

const rejectRequestValidator = [
  body('comment').trim().notEmpty().withMessage('A rejection comment is required.').isLength({ max: 2000 }),
];

module.exports = { createRequestValidator, resubmitRequestValidator, rejectRequestValidator };
