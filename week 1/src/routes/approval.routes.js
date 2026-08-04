const express = require('express');
const { body } = require('express-validator');
const approvalController = require('../controllers/approval.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   GET /api/v1/approvals
 * @desc    Get approvals list
 * @access  Protected
 */
router.get('/', approvalController.getAllApprovals);

/**
 * @route   GET /api/v1/approvals/:id
 * @desc    Get approval by ID
 * @access  Protected
 */
router.get('/:id', approvalController.getApprovalById);

/**
 * @route   POST /api/v1/approvals
 * @desc    Create a new approval request
 * @access  Protected
 */
router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required.')
      .isLength({ min: 3 })
      .withMessage('Title must be at least 3 characters long.'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required.')
      .isLength({ min: 5 })
      .withMessage('Description must be at least 5 characters long.'),
  ],
  validate,
  approvalController.createApproval
);

/**
 * @route   PUT /api/v1/approvals/:id
 * @desc    Update an approval request
 * @access  Protected
 */
router.put(
  '/:id',
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Title must be at least 3 characters long.'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 5 })
      .withMessage('Description must be at least 5 characters long.'),
  ],
  validate,
  approvalController.updateApproval
);

/**
 * @route   DELETE /api/v1/approvals/:id
 * @desc    Delete an approval request
 * @access  Protected
 */
router.delete('/:id', approvalController.deleteApproval);

/**
 * @route   POST /api/v1/approvals/:id/approve
 * @desc    Approve an approval request
 * @access  Protected (Manager, Admin)
 */
router.post('/:id/approve', authorizeRoles(ROLES.MANAGER, ROLES.ADMIN), approvalController.approveApproval);

/**
 * @route   POST /api/v1/approvals/:id/reject
 * @desc    Reject an approval request
 * @access  Protected (Manager, Admin)
 */
router.post('/:id/reject', authorizeRoles(ROLES.MANAGER, ROLES.ADMIN), approvalController.rejectApproval);

module.exports = router;
