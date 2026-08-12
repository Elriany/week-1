const router = require('express').Router();
const statusRequestController = require('../controllers/statusRequest.controller');
const historyController = require('../controllers/history.controller');
const authorizeRoles = require('../middleware/role.middleware');
const { rejectRequestValidator } = require('../validators/request.validator');
const validate = require('../middleware/validation.middleware');

// Status Requests
router.get('/',       authorizeRoles('ADMIN'), statusRequestController.getAll);
router.get('/:id',    authorizeRoles('ADMIN'), statusRequestController.getById);
router.post('/:id/approve', authorizeRoles('ADMIN'), statusRequestController.approve);
router.post('/:id/reject',  authorizeRoles('ADMIN'), rejectRequestValidator, validate, statusRequestController.reject);

module.exports = router;
