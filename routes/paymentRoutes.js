const express = require('express');
const { body } = require('express-validator');

const {
  getPayments,
  getPayment,
  processPayroll,
  getPayrollSummary,
  handleWebhook,
  retryFailedPayments,
  approvePayment,
  approvePaymentsForPeriod
} = require('../controllers/paymentController');

const { authMiddleware, employerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const approvePaymentValidation = [
  body('paymentId').isMongoId().withMessage('Valid payment ID is required')
];

// ============================================
// EMPLOYER ROUTES (Authentication Required)
// ============================================

// Approve a single payment then process it
router.post('/approve', authMiddleware, employerOnly, approvePaymentValidation, approvePayment);

// Approve all pending payments for a period and process them
router.post('/approve/bulk', authMiddleware, employerOnly, approvePaymentsForPeriod);

// Get all payments for company
router.get('/', authMiddleware, employerOnly, getPayments);

// Get payroll summary (define BEFORE :id to avoid param capture)
router.get('/summary', authMiddleware, employerOnly, getPayrollSummary);

// Get single payment details
router.get('/:id', authMiddleware, employerOnly, getPayment);

// Process payroll (calculate and initiate all pending payments)
router.post('/process-payroll', authMiddleware, employerOnly, processPayroll);

// Retry failed payments
router.post('/retry-failed', authMiddleware, employerOnly, retryFailedPayments);

// ============================================
// WEBHOOK ROUTES (No Authentication)
// ============================================

// Arifpay B2C webhook - receives payment status updates
// IMPORTANT: Must return HTTP 200 for Arifpay to mark webhook as processed
router.post('/webhook/arifpay', handleWebhook);

module.exports = router;


