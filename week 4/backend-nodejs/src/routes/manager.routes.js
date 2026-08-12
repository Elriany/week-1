const router = require('express').Router();
const managerController = require('../controllers/manager.controller');
const authorizeRoles = require('../middleware/role.middleware');
const { createManagerValidator, updateManagerValidator } = require('../validators/manager.validator');
const validate = require('../middleware/validation.middleware');

router.get('/',    authorizeRoles('ADMIN'), managerController.getAll);
router.post('/',   authorizeRoles('ADMIN'), createManagerValidator, validate, managerController.create);
router.put('/:id', authorizeRoles('ADMIN'), updateManagerValidator, validate, managerController.update);

module.exports = router;
