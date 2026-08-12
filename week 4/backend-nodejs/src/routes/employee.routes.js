const router = require('express').Router();
const employeeController = require('../controllers/employee.controller');
const authorizeRoles = require('../middleware/role.middleware');
const { createEmployeeValidator } = require('../validators/employee.validator');
const validate = require('../middleware/validation.middleware');

router.get('/',    authorizeRoles('ADMIN', 'MANAGER'), employeeController.getAll);
router.post('/',   authorizeRoles('MANAGER'),          createEmployeeValidator, validate, employeeController.create);
router.get('/:id', authorizeRoles('ADMIN', 'MANAGER'), employeeController.getById);

// Employee status change requests — manager only
router.post('/:id/activation-request',   authorizeRoles('MANAGER'), employeeController.requestActivation);
router.post('/:id/deactivation-request', authorizeRoles('MANAGER'), employeeController.requestDeactivation);

module.exports = router;
