const { body } = require('express-validator');

const createManagerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required.').isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required.').isLength({ max: 100 }),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('phone').optional().isLength({ max: 20 }),
  body('password').optional().isLength({ min: 6 }),
  body('departmentId').optional().isInt().withMessage('departmentId must be an integer.'),
];

const updateManagerValidator = [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isLength({ max: 20 }),
  body('departmentId').optional().isInt(),
];

module.exports = { createManagerValidator, updateManagerValidator };
