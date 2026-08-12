const router = require('express').Router();
const departmentController = require('../controllers/department.controller');
const authorizeRoles = require('../middleware/role.middleware');
const { createDepartmentValidator, updateDepartmentValidator } = require('../validators/department.validator');
const validate = require('../middleware/validation.middleware');

router.get('/',    authorizeRoles('ADMIN'), departmentController.getAll);
router.post('/',   authorizeRoles('ADMIN'), createDepartmentValidator, validate, departmentController.create);
router.get('/:id', authorizeRoles('ADMIN'), departmentController.getById);
router.put('/:id', authorizeRoles('ADMIN'), updateDepartmentValidator, validate, departmentController.update);

module.exports = router;
