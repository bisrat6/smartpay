const express = require('express');
const { body } = require('express-validator');
const { createCompany, getCompany, getMyCompany, updateCompany, getCompanyStats } = require('../controllers/companyController');
const { authMiddleware, employerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const createCompanyValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('employerName').optional().notEmpty().withMessage('Employer name cannot be empty'),
  body('paymentCycle').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid payment cycle'),
  body('bonusRateMultiplier').optional().isFloat({ min: 1.0 }).withMessage('Bonus rate must be at least 1.0'),
  body('maxDailyHours').optional().isInt({ min: 1, max: 24 }).withMessage('Max daily hours must be between 1 and 24'),
  body('arifpayMerchantKey').optional().notEmpty().withMessage('Arifpay merchant key cannot be empty')
];

const updateCompanyValidation = [
  body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('employerName').optional().notEmpty().withMessage('Employer name cannot be empty'),
  body('paymentCycle').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid payment cycle'),
  body('bonusRateMultiplier').optional().isFloat({ min: 1.0 }).withMessage('Bonus rate must be at least 1.0'),
  body('maxDailyHours').optional().isInt({ min: 1, max: 24 }).withMessage('Max daily hours must be between 1 and 24'),
  body('arifpayMerchantKey').optional().notEmpty().withMessage('Arifpay merchant key cannot be empty')
];

// Routes
router.post('/', authMiddleware, employerOnly, createCompanyValidation, createCompany);
router.get('/:id', authMiddleware, getCompany);
router.get('/my/company', authMiddleware, employerOnly, getMyCompany);
router.put('/my/company', authMiddleware, employerOnly, updateCompanyValidation, updateCompany);
router.get('/my/stats', authMiddleware, employerOnly, getCompanyStats);

module.exports = router;
