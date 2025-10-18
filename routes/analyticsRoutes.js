const express = require('express');
const { body } = require('express-validator');
const { generateAttendanceReport, getAnalytics } = require('../controllers/analyticsController');
const { authMiddleware, employerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const attendanceReportValidation = [
  body('periodStart').isISO8601().withMessage('Valid start date is required'),
  body('periodEnd').isISO8601().withMessage('Valid end date is required'),
];

// Routes
router.post('/attendance', authMiddleware, employerOnly, attendanceReportValidation, generateAttendanceReport);
router.get('/', authMiddleware, employerOnly, getAnalytics);

module.exports = router;
