const express = require('express');
const { body } = require('express-validator');

const {
  initiatePayment,
  getPayments,
  getPayment,
  processPayroll,
  getPayrollSummary,
  handleWebhook,
  retryFailedPayments,
  initiatePaymentChapa,
  handleChapaWebhook,
  payWithArifpayTelebirr,
  handleArifpayPayoutWebhook
} = require('../controllers/paymentController');

const { authMiddleware, employerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const initiatePaymentValidation = [
  body('paymentId').isMongoId().withMessage('Valid payment ID is required')
];

// Employer routes
router.post('/initiate', authMiddleware, employerOnly, initiatePaymentValidation, initiatePayment);
router.post('/chapa/initiate', authMiddleware, employerOnly, initiatePaymentValidation, initiatePaymentChapa);
router.get('/', authMiddleware, employerOnly, getPayments);
router.get('/summary', authMiddleware, employerOnly, getPayrollSummary);
router.get('/:id', authMiddleware, employerOnly, getPayment);
router.post('/process-payroll', authMiddleware, employerOnly, processPayroll);
router.post('/retry-failed', authMiddleware, employerOnly, retryFailedPayments);
// Arifpay Telebirr B2C payout
router.post('/arifpay/payout/telebirr', authMiddleware, employerOnly, initiatePaymentValidation, payWithArifpayTelebirr);

// Webhook routes (no auth required)
router.post('/webhook/arifpay', handleWebhook);
router.post('/webhook/chapa', handleChapaWebhook);
router.post('/webhook/arifpay-payout', handleArifpayPayoutWebhook);

module.exports = router;


