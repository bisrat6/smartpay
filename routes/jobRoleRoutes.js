const express = require('express');
const { body } = require('express-validator');
const { createJobRole, getJobRoles, updateJobRole, deleteJobRole } = require('../controllers/jobRoleController');
const { authMiddleware, employerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const createJobRoleValidation = [
  body('name').notEmpty().withMessage('Job role name is required'),
  body('defaultRates.base').isFloat({ min: 0 }).withMessage('Base rate must be a positive number'),
  body('defaultRates.overtime').isFloat({ min: 0 }).withMessage('Overtime rate must be a positive number'),
  body('defaultRates.roleBonus').isFloat({ min: 0 }).withMessage('Role bonus must be a positive number'),
];

const updateJobRoleValidation = [
  body('name').optional().notEmpty().withMessage('Job role name cannot be empty'),
  body('defaultRates.base').optional().isFloat({ min: 0 }).withMessage('Base rate must be a positive number'),
  body('defaultRates.overtime').optional().isFloat({ min: 0 }).withMessage('Overtime rate must be a positive number'),
  body('defaultRates.roleBonus').optional().isFloat({ min: 0 }).withMessage('Role bonus must be a positive number'),
];

// Routes
router.post('/', authMiddleware, employerOnly, createJobRoleValidation, createJobRole);
router.get('/', authMiddleware, employerOnly, getJobRoles);
router.put('/:id', authMiddleware, employerOnly, updateJobRoleValidation, updateJobRole);
router.delete('/:id', authMiddleware, employerOnly, deleteJobRole);

module.exports = router;
