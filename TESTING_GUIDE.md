# Arifpay B2C Payout Testing Guide

## Quick Testing Checklist

Before testing with real money, follow these steps in order:

---

## Step 1: Environment Setup

### 1.1 Update `.env` File
```bash
# Required
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ARIFPAY_MERCHANT_KEY=your_arifpay_api_key

# For testing (dry-run mode - no real API calls)
ARIFPAY_DRY_RUN=true

# Optional - for sandbox testing
# ARIFPAY_BASE_URL=https://sandbox.arifpay.et  # Replace with actual sandbox URL if available

# Your backend URL (for webhooks)
API_BASE_URL=http://localhost:5000
```

### 1.2 Verify Arifpay Account
- [ ] Login to [Arifpay Dashboard](https://dashboard.arifpay.net)
- [ ] Check if **Payouts/Disbursements** feature is enabled
- [ ] Note your API key (should start with `test_` for sandbox or `live_` for production)
- [ ] Check available balance for payouts

---

## Step 2: Dry-Run Testing (No Real API Calls)

### 2.1 Start Server
```bash
cd smartpay-backend
npm run dev
```

Expected output:
```
✓ Server running on port 5000
✓ MongoDB Connected
✓ Scheduler initialized
```

### 2.2 Create Test Employee with Telebirr Number

**Create a test employee:**
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Employee",
    "email": "test.employee@example.com",
    "hourlyRate": 100,
    "position": "Software Engineer",
    "telebirrMsisdn": "251912345678"
  }'
```

**Important:** Phone format must be `251XXXXXXXXX` (no + or 0 prefix)

### 2.3 Create Time Logs
```bash
# Clock in
curl -X POST http://localhost:5000/api/time-logs/clock-in \
  -H "Authorization: Bearer EMPLOYEE_JWT_TOKEN"

# Clock out (after some time)
curl -X POST http://localhost:5000/api/time-logs/clock-out \
  -H "Authorization: Bearer EMPLOYEE_JWT_TOKEN"

# Approve time log (as employer)
curl -X PUT http://localhost:5000/api/time-logs/TIMELOG_ID/approve \
  -H "Authorization: Bearer EMPLOYER_JWT_TOKEN"
```

### 2.4 Test Payroll Processing (Dry-Run)
```bash
curl -X POST http://localhost:5000/api/payments/process-payroll \
  -H "Authorization: Bearer EMPLOYER_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (Dry-Run Mode):**
```json
{
  "message": "Payroll processed successfully",
  "payroll": {
    "employeesWithPayments": 1,
    "totalAmount": 800,
    "period": {
      "startDate": "...",
      "endDate": "..."
    }
  },
  "payments": {
    "total": 1,
    "successful": 1,
    "failed": 0,
    "details": [
      {
        "paymentId": "...",
        "employeeName": "Test Employee",
        "amount": 800,
        "sessionId": "dryrun_...",
        "phoneNumber": "251912345678",
        "success": true
      }
    ]
  }
}
```

---

## Step 3: Sandbox Testing (With Arifpay Test API)

### 3.1 Update Environment
```bash
# In .env, disable dry-run
ARIFPAY_DRY_RUN=false

# Use sandbox URL if available
ARIFPAY_BASE_URL=https://sandbox.arifpay.et  # Check with Arifpay for actual sandbox URL

# Use test API key (starts with test_)
ARIFPAY_MERCHANT_KEY=test_your_sandbox_key_here
```

### 3.2 Test B2C Payout Flow

**Step 1: Process Payroll**
```bash
curl -X POST http://localhost:5000/api/payments/process-payroll \
  -H "Authorization: Bearer EMPLOYER_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected API Calls:**
1. `POST https://sandbox.arifpay.et/api/Telebirr/b2c/session`
2. `POST https://sandbox.arifpay.et/api/Telebirr/b2c/transfer`

**Check Server Logs:**
```
[B2C] Step 1: Creating session for payment 123...
[B2C] Step 1: Session created - 3754BA41DBBE
[B2C] Step 2: Executing transfer for session 3754BA41DBBE
[B2C] Transfer initiated successfully for payment 123
```

### 3.3 Test Webhook Handler

**Simulate Arifpay Webhook:**
```bash
curl -X POST http://localhost:5000/api/payments/webhook/arifpay \
  -H "Content-Type: application/json" \
  -H "x-arifpay-signature: test_signature" \
  -d '{
    "sessionId": "3754BA41DBBE",
    "uuid": "3754BA41DBBE",
    "phone": "251912345678",
    "totalAmount": 800,
    "transactionStatus": "SUCCESS",
    "transaction": {
      "transactionId": "TXN_TEST_123456",
      "transactionStatus": "SUCCESS"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Webhook processed successfully"
}
```

**Check Payment Status:**
```bash
curl http://localhost:5000/api/payments/PAYMENT_ID \
  -H "Authorization: Bearer EMPLOYER_JWT_TOKEN"
```

Expected `status`: `"completed"`

---

## Step 4: Production Testing (Small Amount)

### 4.1 Pre-Production Checklist
- [ ] Sandbox testing completed successfully
- [ ] All employees have valid Telebirr numbers
- [ ] Webhook URL configured in Arifpay dashboard
- [ ] Production API key obtained
- [ ] Account funded with sufficient balance

### 4.2 Update for Production
```bash
# In .env
ARIFPAY_DRY_RUN=false
ARIFPAY_BASE_URL=https://api.arifpay.et
ARIFPAY_MERCHANT_KEY=live_your_production_key_here
API_BASE_URL=https://your-domain.com  # Your actual backend URL
```

### 4.3 Test with Small Amount (1-10 ETB)

**Create test payment:**
1. Create employee with **real** Telebirr number
2. Add minimal time log (e.g., 0.1 hours at 100 ETB/hr = 10 ETB)
3. Process payroll
4. Monitor logs and Arifpay dashboard
5. Verify employee receives money in Telebirr wallet

---

## Troubleshooting

### Common Errors

#### Error: "Unauthorized: Invalid API key or payouts not enabled"
**Solution:**
- Verify API key is correct
- Check if Payouts feature is enabled on your account
- Contact Arifpay support to enable disbursements

#### Error: "Invalid Telebirr phone format"
**Solution:**
- Phone must be `251XXXXXXXXX` format
- No spaces, dashes, or special characters
- Examples:
  - ✅ Valid: `251912345678`
  - ❌ Invalid: `+251912345678`, `0912345678`, `251 91 234 5678`

#### Error: "Failed to create B2C session - no session_id returned"
**Solution:**
- Check if endpoint is correct: `https://api.arifpay.et/api/Telebirr/b2c/session`
- Verify request payload format
- Check server logs for detailed error
- Contact Arifpay if endpoint has changed

#### Error: "Rate limit exceeded"
**Solution:**
- Wait before retrying
- Implement exponential backoff
- Contact Arifpay to increase limits

#### Webhook Not Received
**Solution:**
- Verify webhook URL is publicly accessible
- Check firewall/security settings
- Test webhook URL with ngrok for local testing
- Ensure endpoint returns HTTP 200
- Check Arifpay dashboard for webhook delivery logs

---

## Testing Checklist

### Dry-Run Mode
- [ ] Server starts successfully
- [ ] Employee with Telebirr number created
- [ ] Time logs created and approved
- [ ] Payroll processing returns dry-run success
- [ ] No real API calls made

### Sandbox Mode
- [ ] B2C session creation succeeds
- [ ] B2C transfer execution succeeds
- [ ] Payment status updates to "processing"
- [ ] Webhook handler processes callbacks
- [ ] Payment status updates to "completed"

### Production Mode
- [ ] Small amount test successful
- [ ] Employee receives money in wallet
- [ ] Webhook callbacks work correctly
- [ ] Failed payment retry works
- [ ] Bulk payroll processing works

---

## Monitoring

### What to Monitor

**Server Logs:**
```bash
tail -f logs/app.log | grep B2C
```

**Database:**
```javascript
// Check payment status
db.payments.find({ status: "processing" })

// Check failed payments
db.payments.find({ status: "failed" })
```

**Arifpay Dashboard:**
- Transaction history
- Webhook delivery logs
- Account balance
- API usage/limits

---

## Next Steps After Successful Testing

1. **Update employee data** - Ensure all employees have valid Telebirr numbers
2. **Configure monitoring** - Set up alerts for failed payments
3. **Schedule first payroll** - Test automated scheduler
4. **Train staff** - Document the payroll process
5. **Set up notifications** - Email/SMS to employees when paid

---

## Support

If you encounter issues during testing:

1. **Check logs** - Server logs show detailed error messages
2. **Verify credentials** - API keys, phone numbers, etc.
3. **Test step-by-step** - Don't skip dry-run testing
4. **Contact Arifpay** - support@arifpay.et for API issues
5. **Review code** - Check `services/arifpayService.js` for implementation details

---

**Good luck with testing! 🚀**
