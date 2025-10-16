const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const arifpayService = require('../services/arifpayService');
const payrollService = require('../services/payrollService');
const chapaService = require('../services/chapaService');
const arifpayPayout = require('../services/arifpayPayoutService');
const Employee = require('../models/Employee');


// Initiate payment for an employee (Arifpay)
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

    // Initialize payment with Arifpay
    const result = await arifpayService.initializePayment(paymentId, company.arifpayMerchantKey);

    res.json({
      message: 'Payment initiated successfully',
      ...result
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
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

// Process payroll and initiate payments (Arifpay)
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

    // Initiate payments with Arifpay
    const paymentResults = [];
    for (const payment of pendingPayments) {
      try {
        const result = await arifpayService.initializePayment(
          payment._id, 
          company.arifpayMerchantKey
        );
        paymentResults.push({
          paymentId: payment._id,
          employeeName: payment.employeeId.name,
          amount: payment.amount,
          sessionId: result.sessionId,
          paymentUrl: result.paymentUrl
        });
      } catch (error) {
        paymentResults.push({
          paymentId: payment._id,
          employeeName: payment.employeeId.name,
          amount: payment.amount,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Payroll processed successfully',
      payroll: payrollResult,
      payments: paymentResults
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

// Handle Arifpay webhook
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-arifpay-signature'];
    const payload = req.rawBody || JSON.stringify(req.body);

    const merchantKey = process.env.ARIFPAY_MERCHANT_KEY;

    const isValidSignature = arifpayService.verifyWebhookSignature(
      payload, 
      signature, 
      merchantKey
    );

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const result = await arifpayService.handleWebhook(req.body);

    if (result.success) {
      res.status(200).json({ message: 'Webhook processed successfully' });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
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

// Chapa: Initiate payment
const initiatePaymentChapa = async (req, res) => {
  try {
    const { paymentId } = req.body;

    const payment = await Payment.findById(paymentId).populate('employeeId');
    if (!payment || payment.status !== 'pending') {
      return res.status(400).json({ message: 'Invalid or non-pending payment' });
    }

    const employeeName = payment.employeeId?.name || 'Employee';
    const txRef = `PAY_${payment._id}_${Date.now()}`;
    const callbackUrl = `${process.env.API_BASE_URL}/api/payments/webhook/chapa`;
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;

    const result = await chapaService.initializePayment({
      amount: Number(payment.amount).toFixed(2),
      currency: 'ETB',
      email: 'payer@example.com',
      firstName: employeeName.split(' ')[0] || 'Employee',
      lastName: employeeName.split(' ')[1] || 'User',
      txRef,
      callbackUrl,
      returnUrl
    });

    payment.arifpaySessionId = txRef; // store reference
    payment.status = 'processing';
    await payment.save();

    res.json({
      message: 'Chapa payment initiated',
      txRef,
      paymentUrl: result.checkoutUrl
    });
  } catch (err) {
    console.error('Chapa initiate error:', err);
    res.status(500).json({ message: err.message || 'Chapa initiation failed' });
  }
};

// Chapa: Webhook/verification handler
const handleChapaWebhook = async (req, res) => {
  try {
    const txRef = req.body?.tx_ref || req.query?.tx_ref;
    if (!txRef) return res.status(400).json({ message: 'tx_ref missing' });

    const verify = await chapaService.verifyPayment(txRef);
    if (!verify.success) {
      return res.status(400).json({ message: 'Payment not successful', data: verify.data });
    }

    const payment = await Payment.findOne({ arifpaySessionId: txRef });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'completed';
    payment.arifpayTransactionId = verify.data?.tx_ref || txRef;
    payment.paymentDate = new Date();
    await payment.save();

    res.json({ message: 'Payment verified and completed', paymentId: payment._id });
  } catch (err) {
    console.error('Chapa webhook error:', err);
    res.status(500).json({ message: 'Chapa webhook processing failed' });
  }
};

// Arifpay Telebirr B2C: initiate payout
const payWithArifpayTelebirr = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId).populate('employeeId');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const emp = payment.employeeId;
    if (!emp?.telebirrMsisdn) return res.status(400).json({ message: 'Employee Telebirr wallet not set' });

    const callbackUrl = `${process.env.API_BASE_URL}/api/payments/webhook/arifpay-payout`;

    const result = await arifpayPayout.telebirrB2C({
      phoneNumber: emp.telebirrMsisdn,
      amount: payment.amount,
      reason: `Salary ${payment.period?.startDate ? new Date(payment.period.startDate).toDateString() : ''}`,
      reference: payment._id.toString(),
      callbackUrl
    });

    payment.status = 'processing';
    await payment.save();

    res.json({ message: 'Arifpay payout initiated', result });
  } catch (err) {
    console.error('Arifpay payout error:', err);
    res.status(500).json({ message: 'Payout initiation failed' });
  }
};

// Arifpay payout: webhook callback
const handleArifpayPayoutWebhook = async (req, res) => {
  try {
    const raw = req.rawBody || JSON.stringify(req.body);
    const sig = req.headers['x-arifpay-signature'] || '';
    if (!arifpayPayout.verifySignature(raw, sig)) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const data = req.body; // expect { reference, status, transactionId, reason? }
    const payment = await Payment.findById(data.reference);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (['completed', 'success', 'SUCCESS'].includes(String(data.status).toLowerCase())) {
      payment.status = 'completed';
      payment.arifpayTransactionId = data.transactionId || payment.arifpayTransactionId;
      payment.paymentDate = new Date();
    } else {
      payment.status = 'failed';
      payment.failureReason = data.reason || 'Arifpay payout failed';
    }
    await payment.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Arifpay payout webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

module.exports = {
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
};

