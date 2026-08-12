const { body } = require('express-validator');

const createEmployeeValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required.').isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required.').isLength({ max: 100 }),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('phone').optional().isLength({ max: 20 }),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

module.exports = { createEmployeeValidator };
