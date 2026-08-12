const { body } = require('express-validator');

const createCommentValidator = [
  body('comment').trim().notEmpty().withMessage('Comment cannot be empty.').isLength({ max: 2000 }),
];

module.exports = { createCommentValidator };
