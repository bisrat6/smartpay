const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const arifpayService = require('../services/arifpayService');
const payrollService = require('../services/payrollService');
const Employee = require('../models/Employee');

// ============================================
// ARIFPAY B2C PAYOUT ENDPOINTS
// ============================================

// (Removed) Initiate payment route - superseded by approval flow

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

// Process payroll (calculate only; do not auto-initiate)
const processPayroll = async (req, res) => {
  try {
    // Get company
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Process payroll for the company
    const payrollResult = await payrollService.processPayroll(company._id);

    // Get pending payments count for visibility
    const pendingPayments = await payrollService.getPendingPayments(company._id);

    res.json({
      message: 'Payroll calculated successfully',
      payroll: payrollResult,
      payments: {
        pending: pendingPayments.length
      }
    });
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Approve a single pending payment and immediately process it
const approvePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId } = req.body;

    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const payment = await Payment.findById(paymentId).populate('employeeId', 'companyId name');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: `Payment not approvable (status: ${payment.status})` });
    }

    if (payment.employeeId.companyId.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve this payment' });
    }

    payment.status = 'approved';
    payment.approvedAt = new Date();
    payment.approvedBy = req.user._id;
    await payment.save();

    const result = await arifpayService.initiateTelebirrPayout(payment._id, company.arifpayMerchantKey);

    return res.json({
      message: 'Payment approved and sent',
      paymentId: payment._id,
      ...result
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Approve all pending payments in a period and process them in bulk
const approvePaymentsForPeriod = async (req, res) => {
  try {
    const { startDate, endDate } = req.body || {};

    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const employees = await Employee.find({ companyId: company._id, isActive: true });
    const employeeIds = employees.map(e => e._id);

    let query = {
      employeeId: { $in: employeeIds },
      status: 'pending'
    };

    if (startDate && endDate) {
      query['period.startDate'] = new Date(startDate);
      query['period.endDate'] = new Date(endDate);
    }

    const pendingToApprove = await Payment.find(query);

    if (pendingToApprove.length === 0) {
      return res.json({ message: 'No pending payments to approve', approved: 0, processed: 0 });
    }

    const ids = [];
    for (const p of pendingToApprove) {
      p.status = 'approved';
      p.approvedAt = new Date();
      p.approvedBy = req.user._id;
      await p.save();
      ids.push(p._id.toString());
    }

    const results = await arifpayService.processBulkPayments(ids, company.arifpayMerchantKey);
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return res.json({
      message: 'Approved and processed payments',
      approved: ids.length,
      processed: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Approve payments for period error:', error);
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
  getPayments,
  getPayment,
  approvePayment,
  approvePaymentsForPeriod,
  
  // Payroll processing
  processPayroll,
  getPayrollSummary,
  
  // Webhooks
  handleWebhook,             // B2C webhook handler
  
  // Retry operations
  retryFailedPayments
};

