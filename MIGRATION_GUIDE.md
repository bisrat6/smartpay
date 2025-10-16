# Migration Guide: Checkout to B2C Payout

## Overview
This system has been refactored to use **Arifpay Telebirr B2C Payout** instead of the Checkout flow. This aligns with the project's goal of automated salary disbursement.

---

## What Changed

### ✅ Removed (Checkout - Wrong Direction)
- ❌ Checkout API integration (employees paying company)
- ❌ Chapa payment integration
- ❌ Old `arifpayPayoutService.js` (single-step)
- ❌ Old webhook handlers for Checkout

### ✅ Added (B2C Payout - Correct Direction)
- ✅ 2-step Telebirr B2C process (Session → Transfer)
- ✅ Automated salary disbursement to employee wallets
- ✅ New webhook handler matching Arifpay B2C documentation
- ✅ Phone number validation (251XXXXXXXXX format)

---

## Database Changes

### Employee Model (`models/Employee.js`)
**Changed:**
```javascript
telebirrMsisdn: {
  type: String,
  trim: true,
  required: function() {
    return this.isActive === true;  // Now required for active employees
  },
  validate: {
    validator: function(v) {
      return /^251[0-9]{9}$/.test(v);  // Must match Ethiopian format
    },
    message: 'Telebirr phone number must be in format: 251XXXXXXXXX'
  }
}
```

**Action Required:**
- Update all existing active employees with valid Telebirr numbers in format `251XXXXXXXXX`
- Example: `251912345678`

### Payment Model
**No changes required** - existing fields work perfectly with B2C:
- `arifpaySessionId` - stores B2C session ID
- `arifpayTransactionId` - stores final transaction receipt

---

## Service Changes

### `services/arifpayService.js` - Complete Rewrite

**New Functions:**
1. `createB2CSession()` - Step 1: Create session
2. `executeB2CTransfer()` - Step 2: Execute transfer
3. `initiateTelebirrPayout()` - Main function (combines both steps)
4. `handleB2CWebhook()` - Process B2C webhook callbacks
5. `processBulkPayments()` - Updated for B2C
6. `retryFailedPayments()` - Updated for B2C

**Removed:**
- `initializePayment()` (old Checkout)
- `handleWebhook()` (old Checkout)
- `getPaymentStatus()` (not needed for B2C)

---

## API Changes

### Payment Routes (`routes/paymentRoutes.js`)

**Kept (Same endpoints, different implementation):**
- `POST /api/payments/initiate` - Now uses B2C instead of Checkout
- `POST /api/payments/process-payroll` - Now uses B2C bulk processing
- `POST /api/payments/webhook/arifpay` - Now handles B2C webhook format

**Removed:**
- `POST /api/payments/chapa/initiate` - Chapa integration removed
- `POST /api/payments/webhook/chapa` - Chapa webhook removed
- `POST /api/payments/arifpay/payout/telebirr` - Merged into main `/initiate`
- `POST /api/payments/webhook/arifpay-payout` - Merged into main webhook

---

## Controller Changes (`controllers/paymentController.js`)

**Updated:**
- `initiatePayment()` - Now calls `initiateTelebirrPayout()`
- `processPayroll()` - Uses B2C bulk processing
- `handleWebhook()` - Handles new B2C webhook format

**Removed:**
- `initiatePaymentChapa()`
- `handleChapaWebhook()`
- `payWithArifpayTelebirr()` (merged into main function)
- `handleArifpayPayoutWebhook()` (merged into main webhook)

---

## Webhook Format Change

### Old Format (Checkout)
```json
{
  "sessionId": "...",
  "status": "completed",
  "transactionId": "..."
}
```

### New Format (B2C - From Documentation)
```json
{
  "uuid": "SESSIONID",
  "sessionId": "SESSIONID",
  "phone": "251911111111",
  "totalAmount": 500,
  "transactionStatus": "SUCCESS",
  "transaction": {
    "transactionId": "RECEIPT_Number",
    "transactionStatus": "SUCCESS"
  }
}
```

**Status Codes:**
- `SUCCESS` → Completed
- `PENDING` → Processing
- `FAILED` → Failed
- `CANCELED/CANCELLED` → Cancelled
- `EXPIRED` → Expired
- `UNAUTHORIZED/FORBIDDEN` → Auth error

---

## ✅ Endpoint Configuration Complete

### Arifpay B2C Payout Endpoints

**File:** `services/arifpayService.js`

**Step 1 - Create Session:**
```javascript
POST https://api.arifpay.et/api/Telebirr/b2c/session
```
✅ **Implemented** (Line 23)

**Step 2 - Execute Transfer:**
```javascript
POST https://api.arifpay.et/api/Telebirr/b2c/transfer
```
✅ **Implemented** (Line 60)

**Authentication:** Bearer Token via `Authorization` header

---

## Testing Guide

### 1. Dry-Run Mode (No Real API Calls)
Set in `.env`:
```
ARIFPAY_DRY_RUN=true
```

This simulates B2C payouts without calling Arifpay API.

### 2. Test Employee Setup
```javascript
// Create employee with Telebirr number
{
  "name": "Test Employee",
  "email": "test@example.com",
  "hourlyRate": 100,
  "telebirrMsisdn": "251912345678"  // Required format
}
```

### 3. Test B2C Payout
```bash
POST /api/payments/initiate
{
  "paymentId": "payment_id_here"
}
```

**Expected Response:**
```json
{
  "message": "B2C payout initiated successfully",
  "sessionId": "3754BA41DBBE",
  "paymentId": "...",
  "amount": 1500,
  "phoneNumber": "251912345678",
  "success": true
}
```

### 4. Test Webhook (Local)
```bash
POST http://localhost:5000/api/payments/webhook/arifpay
Headers:
  x-arifpay-signature: <signature>
Body:
{
  "sessionId": "3754BA41DBBE",
  "transactionStatus": "SUCCESS",
  "transaction": {
    "transactionId": "TXN123456",
    "transactionStatus": "SUCCESS"
  }
}
```

**Must return:** HTTP 200 for Arifpay to mark as processed

---

## Environment Variables

### Required Changes to `.env`

```bash
# Required
ARIFPAY_MERCHANT_KEY=your_merchant_key_here
MONGO_URI=your_mongodb_uri

# Optional but recommended
ARIFPAY_BASE_URL=https://gateway.arifpay.net/api/v1
API_BASE_URL=https://your-domain.com  # For webhook callbacks
ARIFPAY_DRY_RUN=false  # Set to true for testing

# Not needed anymore
# ARIFPAY_WEBHOOK_URL (removed)
# CHAPA_SECRET_KEY (removed)
# CHAPA_BASE_URL (removed)
```

---

## Migration Checklist

### Database
- [ ] Update all active employees with `telebirrMsisdn` in format `251XXXXXXXXX`
- [ ] Run data validation script to check phone formats

### Code
- [x] Employee model updated with validation
- [x] arifpayService.js rewritten for B2C
- [x] Payment controller updated
- [x] Routes cleaned up
- [x] Scheduler updated
- [x] README updated

### Configuration
- [ ] Update `.env` with correct variables
- [ ] Remove unused environment variables (Chapa)
- [ ] Configure webhook URL in Arifpay merchant dashboard

### Arifpay Setup
- [x] Step 1 session creation endpoint configured (`https://api.arifpay.et/api/Telebirr/b2c/session`)
- [x] Updated `services/arifpayService.js` with correct endpoint
- [ ] Verify API key has Payout/Disbursement permissions enabled
- [ ] Configure webhook URL in Arifpay dashboard: `https://your-domain.com/api/payments/webhook/arifpay`
- [ ] Test webhook signature verification
- [ ] Ensure webhook endpoint is publicly accessible

### Testing
- [ ] Test B2C payout in dry-run mode
- [ ] Test with real Arifpay credentials (small amount)
- [ ] Verify webhook callbacks work correctly
- [ ] Test bulk payroll processing
- [ ] Test retry mechanism for failed payments

---

## Rollback Plan (If Needed)

If you need to rollback to the old system:

1. **Restore from Git:**
   ```bash
   git checkout <commit-before-refactor>
   ```

2. **Or manually revert files:**
   - Restore `services/arifpayService.js` (old Checkout version)
   - Restore `controllers/paymentController.js`
   - Restore `routes/paymentRoutes.js`
   - Restore `models/Employee.js` (remove validation)

---

## Support & Next Steps

### Immediate Actions:
1. ✅ Code refactoring completed
2. ✅ **Step 1 endpoint configured** (`https://api.arifpay.et/api/Telebirr/b2c/session`)
3. ⚠️ **Verify Arifpay account has Payout permissions enabled**
4. Update all employee Telebirr numbers (format: `251XXXXXXXXX`)
5. Test in dry-run mode
6. Test with real API (small amounts)

### Questions for Arifpay Support (if needed):
1. ~~What is the Step 1: Create Session endpoint for Telebirr B2C?~~ ✅ Found
2. Is my account enabled for Payouts/Disbursements? (Check dashboard first)
3. What is the sandbox URL for testing B2C payouts?
4. What is the webhook retry policy if our endpoint is down?
5. Are there daily/monthly limits on B2C transfers?

---

## Contact

If you encounter issues:
1. Check logs for detailed error messages
2. Verify employee phone numbers match format `251XXXXXXXXX`
3. Ensure webhook returns HTTP 200
4. Check Arifpay dashboard for transaction status

**Created:** 2025-10-16
**Version:** 1.0.0
