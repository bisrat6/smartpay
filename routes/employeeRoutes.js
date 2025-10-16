const express = require('express');
const { body } = require('express-validator');
const { addEmployee, getEmployee, getEmployees, updateEmployee, deleteEmployee, getMyProfile } = require('../controllers/employeeController');
const { authMiddleware, employerOnly, employeeOnly, sameCompanyOrEmployer } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const addEmployeeValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name').notEmpty().withMessage('Employee name is required'),
  body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('telebirrMsisdn').matches(/^251[0-9]{9}$/).withMessage('Telebirr number must be in format: 251XXXXXXXXX'),
  body('phoneNumber').optional().trim(),
  body('address').optional().trim()
];

const updateEmployeeValidation = [
  body('name').optional().notEmpty().withMessage('Employee name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('telebirrMsisdn').optional().matches(/^251[0-9]{9}$/).withMessage('Telebirr number must be in format: 251XXXXXXXXX'),
  body('phoneNumber').optional().trim(),
  body('address').optional().trim()
];

// Routes
router.post('/', authMiddleware, employerOnly, addEmployeeValidation, addEmployee);
router.get('/', authMiddleware, employerOnly, getEmployees);
router.get('/my/profile', authMiddleware, employeeOnly, getMyProfile);
router.get('/:id', authMiddleware, sameCompanyOrEmployer, getEmployee);
router.put('/:id', authMiddleware, employerOnly, updateEmployeeValidation, updateEmployee);
router.delete('/:id', authMiddleware, employerOnly, deleteEmployee);

module.exports = router;
