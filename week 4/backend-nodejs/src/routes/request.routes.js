const router = require('express').Router();
const requestController = require('../controllers/request.controller');
const authorizeRoles = require('../middleware/role.middleware');
const { createRequestValidator, rejectRequestValidator, resubmitRequestValidator } = require('../validators/request.validator');
const { createCommentValidator } = require('../validators/comment.validator');
const validate = require('../middleware/validation.middleware');

// CRUD + Workflow
router.get('/',    requestController.getAll);
router.post('/',   authorizeRoles('EMPLOYEE', 'MANAGER'), createRequestValidator, validate, requestController.create);
router.get('/:id', requestController.getById);

// Workflow transitions
router.post('/:id/submit',   authorizeRoles('EMPLOYEE', 'MANAGER'), requestController.submit);
router.post('/:id/approve',  authorizeRoles('MANAGER', 'ADMIN'),    requestController.approve);
router.post('/:id/reject',   authorizeRoles('MANAGER', 'ADMIN'),    rejectRequestValidator, validate, requestController.reject);
router.post('/:id/resubmit', authorizeRoles('EMPLOYEE', 'MANAGER'), resubmitRequestValidator, validate, requestController.resubmit);
router.post('/:id/cancel',   authorizeRoles('EMPLOYEE', 'MANAGER'), requestController.cancel);

// Comments
router.get('/:id/comments',  requestController.getComments);
router.post('/:id/comments', createCommentValidator, validate, requestController.addComment);

// History
router.get('/:id/history',   requestController.getHistory);

module.exports = router;
