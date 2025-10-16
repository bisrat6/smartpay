const express = require('express');
const { body } = require('express-validator');
const { clockIn, clockOut, getTimeLogs, getCompanyTimeLogs, approveTimeLog, getClockStatus } = require('../controllers/timeLogController');
const { authMiddleware, employerOnly, employeeOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const approveTimeLogValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional().trim()
];

// Employee routes
router.post('/clock-in', authMiddleware, employeeOnly, clockIn);
router.post('/clock-out', authMiddleware, employeeOnly, clockOut);
router.get('/my/status', authMiddleware, employeeOnly, getClockStatus);
router.get('/my', authMiddleware, employeeOnly, getTimeLogs);

// Employer routes
router.get('/company', authMiddleware, employerOnly, getCompanyTimeLogs);
router.put('/:id/approve', authMiddleware, employerOnly, approveTimeLogValidation, approveTimeLog);

module.exports = router;
