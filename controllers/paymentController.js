const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const arifpayService = require('../services/arifpayService');
const payrollService = require('../services/payrollService');
const Employee = require('../models/Employee');

// ============================================
// ARIFPAY B2C PAYOUT ENDPOINTS
// ============================================

// Initiate B2C payout for an employee (Main payment method)
const initiatePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId } = req.body;

    // Get company for current user
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Initiate B2C payout via Telebirr
    const result = await arifpayService.initiateTelebirrPayout(paymentId, company.arifpayMerchantKey);

    res.json({
      message: 'B2C payout initiated successfully',
      ...result
    });
  } catch (error) {
    console.error('Initiate B2C payout error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get payments for company
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, employeeId } = req.query;
    
    // Get company
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get employees for this company
    const Employee = require('../models/Employee');
    const employees = await Employee.find({ companyId: company._id });
    const employeeIds = employees.map(emp => emp._id);

    // Build query
    const query = { employeeId: { $in: employeeIds } };
    if (status) {
      query.status = status;
    }
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const payments = await Payment.find(query)
      .populate('employeeId', 'name hourlyRate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment by ID
const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('employeeId', 'name hourlyRate')
      .populate('timeLogIds');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Process payroll and initiate B2C payments
const processPayroll = async (req, res) => {
  try {
    // Get company
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Process payroll for the company
    const payrollResult = await payrollService.processPayroll(company._id);

    // Get pending payments
    const pendingPayments = await payrollService.getPendingPayments(company._id);

    // Initiate B2C payouts for all pending payments
    const paymentResults = [];
    for (const payment of pendingPayments) {
      try {
        const result = await arifpayService.initiateTelebirrPayout(
          payment._id, 
          company.arifpayMerchantKey
        );
        paymentResults.push({
          paymentId: payment._id,
          employeeName: payment.employeeId.name,
          amount: payment.amount,
          sessionId: result.sessionId,
          phoneNumber: result.phoneNumber,
          success: true
        });
      } catch (error) {
        paymentResults.push({
          paymentId: payment._id,
          employeeName: payment.employeeId.name,
          amount: payment.amount,
          success: false,
          error: error.message
        });
      }
    }

    const successful = paymentResults.filter(p => p.success).length;
    const failed = paymentResults.filter(p => !p.success).length;

    res.json({
      message: 'Payroll processed successfully',
      payroll: payrollResult,
      payments: {
        total: paymentResults.length,
        successful,
        failed,
        details: paymentResults
      }
    });
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get payroll summary
const getPayrollSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get company
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const period = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: endDate ? new Date(endDate) : new Date()
    };

    const summary = await payrollService.getPayrollSummary(company._id, period);

    res.json({ summary });
  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Handle Arifpay B2C webhook
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-arifpay-signature'];
    const payload = req.rawBody || JSON.stringify(req.body);

    const merchantKey = process.env.ARIFPAY_MERCHANT_KEY;

    // Verify webhook signature for security
    const isValidSignature = arifpayService.verifyWebhookSignature(
      payload, 
      signature, 
      merchantKey
    );

    if (!isValidSignature) {
      console.warn('[B2C Webhook] Invalid signature received');
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    // Process B2C webhook
    const result = await arifpayService.handleB2CWebhook(req.body);

    if (result.success) {
      // Webhook MUST return HTTP 200 for Arifpay to mark it as processed
      return res.status(200).json({ message: 'Webhook processed successfully' });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('[B2C Webhook] Processing error:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Retry failed payments (Arifpay)
const retryFailedPayments = async (req, res) => {
  try {
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const results = await arifpayService.retryFailedPayments(
      company._id, 
      company.arifpayMerchantKey
    );

    res.json({
      message: 'Failed payments retry completed',
      results
    });
  } catch (error) {
    console.error('Retry failed payments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// MODULE EXPORTS
// ============================================

module.exports = {
  // Payment operations
  initiatePayment,           // Main B2C payout initiation
  getPayments,
  getPayment,
  
  // Payroll processing
  processPayroll,
  getPayrollSummary,
  
  // Webhooks
  handleWebhook,             // B2C webhook handler
  
  // Retry operations
  retryFailedPayments
};

