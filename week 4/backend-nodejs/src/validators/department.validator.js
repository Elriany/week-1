const { body } = require('express-validator');

const createDepartmentValidator = [
  body('code').trim().notEmpty().withMessage('Department code is required.')
    .isLength({ max: 20 }).withMessage('Code must be at most 20 characters.'),
  body('name').trim().notEmpty().withMessage('Department name is required.')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be at most 500 characters.'),
];

const updateDepartmentValidator = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters.'),
  body('code').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Code must be 1-20 characters.'),
  body('description').optional().isLength({ max: 500 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  body('managerId').optional().isInt().withMessage('managerId must be an integer.'),
];

module.exports = { createDepartmentValidator, updateDepartmentValidator };
