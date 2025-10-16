const axios = require('axios');

const BASE = process.env.CHAPA_BASE_URL || 'https://api.chapa.co';
const SECRET = process.env.CHAPA_SECRET_KEY;

async function initializePayment({ amount, currency = 'ETB', email, firstName, lastName, txRef, callbackUrl, returnUrl }) {
  const res = await axios.post(`${BASE}/v1/transaction/initialize`, {
    amount: String(amount),
    currency,
    email,
    first_name: firstName || 'Payer',
    last_name: lastName || 'User',
    tx_ref: txRef,
    callback_url: callbackUrl,
    return_url: returnUrl
  }, {
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.data || res.data.status !== 'success') {
    throw new Error(res.data?.message || 'Failed to initialize Chapa payment');
  }

  return {
    checkoutUrl: res.data.data.checkout_url,
    txRef
  };
}

async function verifyPayment(txRef) {
  const res = await axios.get(`${BASE}/v1/transaction/verify/${txRef}`, {
    headers: { Authorization: `Bearer ${SECRET}` }
  });

  if (!res.data || res.data.status !== 'success') {
    return { success: false, data: res.data };
  }

  return { success: res.data.data.status === 'success', data: res.data.data };
}

module.exports = { initializePayment, verifyPayment };


