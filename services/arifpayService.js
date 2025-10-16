const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Employee = require("../models/Employee");

// Arifpay API configuration
const ARIFPAY_API_URL = "https://gateway.arifpay.net/api/v1";
const ARIFPAY_WEBHOOK_URL =
  process.env.ARIFPAY_WEBHOOK_URL ||
  "https://your-domain.com/api/webhook/arifpay";

// Convert amounts to minor units if required (e.g., cents)
const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

// Initialize payment session with Arifpay
const initializePayment = async (paymentId, merchantKey) => {
  try {
    // Dry-run mode for development: simulate Arifpay responses if env flag is set.
    if (process.env.ARIFPAY_DRY_RUN === "true") {
      const fakeSession = `dryrun_${paymentId}_${Date.now()}`;
      // mark payment as processing and set fake session id
      await Payment.findByIdAndUpdate(paymentId, {
        status: "processing",
        arifpaySessionId: fakeSession,
      });
      return {
        sessionId: fakeSession,
        paymentUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/payment/dryrun/${fakeSession}`,
        paymentId: paymentId,
      };
    }

    const payment = await Payment.findById(paymentId).populate("employeeId");

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending status");
    }

    // Prepare payment data for Arifpay
    const paymentData = {
      cancelUrl: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/payment/cancel`,
      notifyUrl: process.env.API_BASE_URL
        ? `${process.env.API_BASE_URL}/api/payments/webhook/arifpay`
        : ARIFPAY_WEBHOOK_URL,
      expireDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      nonce: Date.now().toString(),
      successUrl: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/payment/success`,
      currency: "ETB",
      items: [
        {
          name: `Salary Payment - ${payment.employeeId.name}`,
          quantity: 1,
          price: toMinorUnits(payment.amount),
          description: `Salary payment for period ${payment.period.startDate.toDateString()} - ${payment.period.endDate.toDateString()}`,
        },
      ],
      customerInfo: {
        firstName: payment.employeeId.name,
      },
      beneficiaries: [
        {
          accountNumber: "1000000000", // This should be employee's bank account
          bank: "AWINETAA",
          amount: toMinorUnits(payment.amount),
        },
      ],
    };

    // Make API call to Arifpay
    const response = await axios.post(
      `${ARIFPAY_API_URL}/checkout/session`,
      paymentData,
      {
        headers: {
          "x-arifpay-key": merchantKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.data) {
      // Update payment with Arifpay session ID
      payment.arifpaySessionId = response.data.data.sessionId;
      payment.status = "processing";
      await payment.save();

      return {
        sessionId: response.data.data.sessionId,
        paymentUrl: response.data.data.paymentUrl,
        paymentId: payment._id,
      };
    } else {
      throw new Error("Invalid response from Arifpay");
    }
  } catch (error) {
    console.error("Initialize payment error:", error);

    // Update payment status to failed
    await Payment.findByIdAndUpdate(paymentId, {
      status: "failed",
      failureReason: error.message,
    });

    throw error;
  }
};

// Verify webhook signature
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

// Handle webhook from Arifpay
const handleWebhook = async (webhookData) => {
  try {
    const { sessionId, status, transactionId, amount } = webhookData;

    // Find payment by session ID
    const payment = await Payment.findOne({ arifpaySessionId: sessionId });

    if (!payment) {
      console.error("Payment not found for session ID:", sessionId);
      return { success: false, message: "Payment not found" };
    }

    // Update payment status based on webhook
    switch (status) {
      case "completed":
      case "success":
        payment.status = "completed";
        payment.arifpayTransactionId = transactionId;
        payment.paymentDate = new Date();
        break;

      case "failed":
      case "cancelled":
        payment.status = "failed";
        payment.failureReason = webhookData.message || "Payment failed";
        break;

      default:
        console.log("Unknown webhook status:", status);
        return { success: false, message: "Unknown status" };
    }

    await payment.save();

    return {
      success: true,
      message: "Payment status updated successfully",
      paymentId: payment._id,
      status: payment.status,
    };
  } catch (error) {
    console.error("Handle webhook error:", error);
    return { success: false, message: error.message };
  }
};

// Get payment status from Arifpay
const getPaymentStatus = async (sessionId, merchantKey) => {
  try {
    // Dev dry-run: return a simulated completed status if sessionId starts with dryrun_
    if (
      process.env.ARIFPAY_DRY_RUN === "true" &&
      String(sessionId).startsWith("dryrun_")
    ) {
      return {
        data: {
          sessionId,
          status: "completed",
          transactionId: `tx_${sessionId}`,
        },
      };
    }
    const response = await axios.get(
      `${ARIFPAY_API_URL}/checkout/session/${sessionId}`,
      {
        headers: {
          "x-arifpay-key": merchantKey,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Get payment status error:", error);
    throw error;
  }
};

// Process multiple payments
const processBulkPayments = async (paymentIds, merchantKey) => {
  try {
    const results = [];

    for (const paymentId of paymentIds) {
      try {
        const result = await initializePayment(paymentId, merchantKey);
        results.push({
          paymentId,
          success: true,
          sessionId: result.sessionId,
          paymentUrl: result.paymentUrl,
        });
      } catch (error) {
        results.push({
          paymentId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Process bulk payments error:", error);
    throw error;
  }
};

// Retry failed payments
const retryFailedPayments = async (companyId, merchantKey) => {
  try {
    const Employee = require("../models/Employee");

    // Get employees for company
    const employees = await Employee.find({ companyId, status: "active" });
    const employeeIds = employees.map((emp) => emp._id);

    // Get failed payments that haven't exceeded retry limit
    const failedPayments = await Payment.find({
      employeeId: { $in: employeeIds },
      status: "failed",
      retryCount: { $lt: 3 },
    });

    const results = [];

    for (const payment of failedPayments) {
      try {
        // Reset payment status to pending for retry
        payment.status = "pending";
        payment.retryCount += 1;
        await payment.save();

        const result = await initializePayment(payment._id, merchantKey);
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
    console.error("Retry failed payments error:", error);
    throw error;
  }
};

module.exports = {
  initializePayment,
  verifyWebhookSignature,
  handleWebhook,
  getPaymentStatus,
  processBulkPayments,
  retryFailedPayments,
};
