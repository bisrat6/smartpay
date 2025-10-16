const express = require('express');
const { body } = require('express-validator');
const { signup, login, getProfile, changePassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['employer', 'employee']).withMessage('Role must be employer or employee'),
  body('companyName').if(body('role').equals('employer')).notEmpty().withMessage('Company name is required for employers'),
  body('employerName').if(body('role').equals('employer')).notEmpty().withMessage('Employer name is required for employers'),
  body('arifpayMerchantKey').if(body('role').equals('employer')).notEmpty().withMessage('Arifpay merchant key is required for employers')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.get('/profile', authMiddleware, getProfile);
router.post('/change-password', authMiddleware, changePasswordValidation, changePassword);

module.exports = router;
