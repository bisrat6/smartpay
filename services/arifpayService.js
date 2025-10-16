const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Employee = require("../models/Employee");

// Arifpay API configuration
// Base URL: https://api.arifpay.et (production) or use env variable for custom/sandbox
const ARIFPAY_API_URL = process.env.ARIFPAY_BASE_URL || "https://api.arifpay.et";
const ARIFPAY_KEY = process.env.ARIFPAY_MERCHANT_KEY;

// ============================================
// TELEBIRR B2C PAYOUT - 2-STEP PROCESS
// ============================================

/**
 * Step 1: Create B2C Payout Session
 * Endpoint: POST https://api.arifpay.et/api/Telebirr/b2c/session
 * Creates a payout session for Telebirr B2C transfer
 * Returns session_id for use in Step 2
 */
const createB2CSession = async ({ amount, phoneNumber, reference, callbackUrl, merchantKey }) => {
  try {
    // Arifpay B2C Payout Session Creation Endpoint
    const sessionEndpoint = `${ARIFPAY_API_URL}/Telebirr/b2c/session`;
    
    const payload = {
      amount: Number(amount).toFixed(2),
      currency: "ETB",
      recipient: {
        phone: phoneNumber, // Format: +251XXXXXXXXX or 251XXXXXXXXX
        name: "Employee" // Optional, aids compliance
      },
      reference: reference, // Unique ID (e.g., payment ID)
      description: callbackUrl ? "Salary disbursement" : "Payroll payment",
      expire_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Add callback URL if provided
    if (callbackUrl) {
      payload.callback_url = callbackUrl;
    }

    const response = await axios.post(sessionEndpoint, payload, {
      headers: {
        "Authorization": `Bearer ${merchantKey || ARIFPAY_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Expected response: { success: true, session_id: "3754BA41DBBE", status: "PENDING", ... }
    if (!response.data || !response.data.session_id) {
      throw new Error("Failed to create B2C session - no session_id returned");
    }

    return {
      sessionId: response.data.session_id,
      status: response.data.status,
      success: true
    };
  } catch (error) {
    console.error("Create B2C session error:", error.response?.data || error.message);
    
    // Handle specific errors
    if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response.data.message || 'Check amount, phone format, or duplicate reference'}`);
    } else if (error.response?.status === 401) {
      throw new Error('Unauthorized: Invalid API key or payouts not enabled on your account');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded: Too many requests');
    }
    
    throw new Error(`Session creation failed: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Step 2: Execute B2C Transfer
 * Documented endpoint: POST /api/Telebirr/b2c/transfer
 */
const executeB2CTransfer = async ({ sessionId, phoneNumber, merchantKey }) => {
  try {
    const transferEndpoint = `${ARIFPAY_API_URL}/Telebirr/b2c/transfer`;
    
    const payload = {
      Sessionid: sessionId,
      Phonenumber: phoneNumber
    };

    const response = await axios.post(transferEndpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-arifpay-key": merchantKey || ARIFPAY_KEY,
      },
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("Execute B2C transfer error:", error.response?.data || error.message);
    throw new Error(`Transfer execution failed: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Complete B2C Payout (combines Step 1 & Step 2)
 * This is the main function to initiate salary payment
 */
const initiateTelebirrPayout = async (paymentId, merchantKey) => {
  try {
    // Dry-run mode for testing
    if (process.env.ARIFPAY_DRY_RUN === "true") {
      const fakeSession = `dryrun_${paymentId}_${Date.now()}`;
      await Payment.findByIdAndUpdate(paymentId, {
        status: "processing",
        arifpaySessionId: fakeSession,
      });
      return {
        sessionId: fakeSession,
        success: true,
        message: "Dry-run mode: B2C payout simulated",
        paymentId: paymentId,
      };
    }

    const payment = await Payment.findById(paymentId).populate("employeeId");

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
      throw new Error(`Payment is not in pending status (current: ${payment.status})`);
    }

    const employee = payment.employeeId;
    
    if (!employee.telebirrMsisdn) {
      throw new Error("Employee Telebirr wallet number (telebirrMsisdn) is not set");
    }

    // Validate phone format
    if (!/^251[0-9]{9}$/.test(employee.telebirrMsisdn)) {
      throw new Error("Invalid Telebirr phone format. Expected: 251XXXXXXXXX");
    }

    const callbackUrl = process.env.API_BASE_URL 
      ? `${process.env.API_BASE_URL}/api/payments/webhook/arifpay`
      : "https://your-domain.com/api/payments/webhook/arifpay";

    // STEP 1: Create session
    console.log(`[B2C] Step 1: Creating session for payment ${paymentId}`);
    const sessionResult = await createB2CSession({
      amount: payment.amount,
      phoneNumber: employee.telebirrMsisdn,
      reference: payment._id.toString(),
      callbackUrl,
      merchantKey
    });

    // Save session ID
    payment.arifpaySessionId = sessionResult.sessionId;
    await payment.save();

    console.log(`[B2C] Step 1: Session created - ${sessionResult.sessionId}`);

    // STEP 2: Execute transfer
    console.log(`[B2C] Step 2: Executing transfer for session ${sessionResult.sessionId}`);
    await executeB2CTransfer({
      sessionId: sessionResult.sessionId,
      phoneNumber: employee.telebirrMsisdn,
      merchantKey
    });

    // Update payment status
    payment.status = "processing";
    await payment.save();

    console.log(`[B2C] Transfer initiated successfully for payment ${paymentId}`);

    return {
      sessionId: sessionResult.sessionId,
      paymentId: payment._id,
      amount: payment.amount,
      phoneNumber: employee.telebirrMsisdn,
      success: true,
      message: "B2C payout initiated successfully"
    };
  } catch (error) {
    console.error("Initiate Telebirr payout error:", error);

    // Update payment status to failed
    await Payment.findByIdAndUpdate(paymentId, {
      status: "failed",
      failureReason: error.message,
    });

    throw error;
  }
};

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Verify webhook signature for security
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    if (!signature || typeof signature !== "string") return false;
    if (!secret || typeof secret !== "string") return false;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    // Ensure buffers are same length to avoid timingSafeEqual throwing
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
};

/**
 * Handle B2C Payout Webhook
 * Documented webhook format:
 * {
 *   "uuid": "SESSIONID",
 *   "sessionId": "SESSIONID",
 *   "phone": "251911111111",
 *   "totalAmount": 500,
 *   "transactionStatus": "SUCCESS",
 *   "transaction": {
 *     "transactionId": "RECEIPT_Number",
 *     "transactionStatus": "SUCCESS"
 *   }
 * }
 */
const handleB2CWebhook = async (webhookData) => {
  try {
    const { sessionId, uuid, transactionStatus, transaction } = webhookData;
    const lookupSessionId = sessionId || uuid;

    if (!lookupSessionId) {
      console.error("Webhook missing sessionId/uuid");
      return { success: false, message: "Missing session identifier" };
    }

    // Find payment by session ID
    const payment = await Payment.findOne({ arifpaySessionId: lookupSessionId });

    if (!payment) {
      console.error("Payment not found for session ID:", lookupSessionId);
      return { success: false, message: "Payment not found" };
    }

    console.log(`[B2C Webhook] Processing for payment ${payment._id}, status: ${transactionStatus}`);

    // Map Arifpay status codes to internal status
    const status = (transactionStatus || transaction?.transactionStatus || "").toUpperCase();
    
    switch (status) {
      case "SUCCESS":
        payment.status = "completed";
        payment.arifpayTransactionId = transaction?.transactionId || payment.arifpayTransactionId;
        payment.paymentDate = new Date();
        console.log(`[B2C Webhook] Payment ${payment._id} completed`);
        break;

      case "PENDING":
        payment.status = "processing";
        console.log(`[B2C Webhook] Payment ${payment._id} still processing`);
        break;

      case "FAILED":
        payment.status = "failed";
        payment.failureReason = webhookData.reason || webhookData.message || "B2C transfer failed";
        console.log(`[B2C Webhook] Payment ${payment._id} failed: ${payment.failureReason}`);
        break;

      case "CANCELED":
      case "CANCELLED":
        payment.status = "cancelled";
        payment.failureReason = "Transaction cancelled";
        console.log(`[B2C Webhook] Payment ${payment._id} cancelled`);
        break;

      case "EXPIRED":
        payment.status = "failed";
        payment.failureReason = "Session expired";
        console.log(`[B2C Webhook] Payment ${payment._id} expired`);
        break;

      case "UNAUTHORIZED":
      case "FORBIDDEN":
        payment.status = "failed";
        payment.failureReason = `Authorization error: ${status}`;
        console.log(`[B2C Webhook] Payment ${payment._id} auth error`);
        break;

      default:
        console.log(`[B2C Webhook] Unknown status for payment ${payment._id}: ${status}`);
        return { success: false, message: `Unknown status: ${status}` };
    }

    await payment.save();

    return {
      success: true,
      message: "Webhook processed successfully",
      paymentId: payment._id,
      status: payment.status,
    };
  } catch (error) {
    console.error("Handle B2C webhook error:", error);
    return { success: false, message: error.message };
  }
};

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Process multiple B2C payments in bulk
 */
const processBulkPayments = async (paymentIds, merchantKey) => {
  try {
    const results = [];

    console.log(`[B2C Bulk] Processing ${paymentIds.length} payments`);

    for (const paymentId of paymentIds) {
      try {
        const result = await initiateTelebirrPayout(paymentId, merchantKey);
        results.push({
          paymentId,
          success: true,
          sessionId: result.sessionId,
          amount: result.amount,
          phoneNumber: result.phoneNumber,
        });
      } catch (error) {
        results.push({
          paymentId,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[B2C Bulk] Completed: ${successful} successful, ${failed} failed`);

    return results;
  } catch (error) {
    console.error("Process bulk B2C payments error:", error);
    throw error;
  }
};

/**
 * Retry failed B2C payments
 */
const retryFailedPayments = async (companyId, merchantKey) => {
  try {
    // Get employees for company
    const employees = await Employee.find({ companyId, isActive: true });
    const employeeIds = employees.map((emp) => emp._id);

    // Get failed payments that haven't exceeded retry limit
    const failedPayments = await Payment.find({
      employeeId: { $in: employeeIds },
      status: "failed",
      retryCount: { $lt: 3 },
    });

    console.log(`[B2C Retry] Found ${failedPayments.length} failed payments to retry`);

    const results = [];

    for (const payment of failedPayments) {
      try {
        // Reset payment status to pending for retry
        payment.status = "pending";
        payment.retryCount += 1;
        await payment.save();

        const result = await initiateTelebirrPayout(payment._id, merchantKey);
        results.push({
          paymentId: payment._id,
          success: true,
          sessionId: result.sessionId,
          retryCount: payment.retryCount,
        });
      } catch (error) {
        results.push({
          paymentId: payment._id,
          success: false,
          error: error.message,
          retryCount: payment.retryCount,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Retry failed B2C payments error:", error);
    throw error;
  }
};

module.exports = {
  // Main B2C functions
  initiateTelebirrPayout,
  createB2CSession,
  executeB2CTransfer,
  
  // Webhook handling
  verifyWebhookSignature,
  handleB2CWebhook,
  
  // Bulk operations
  processBulkPayments,
  retryFailedPayments,
};
