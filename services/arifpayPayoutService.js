const axios = require("axios");
const crypto = require("crypto");

const ARIFPAY_BASE =
  process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.net/api/v1";
const ARIFPAY_KEY = process.env.ARIFPAY_MERCHANT_KEY;

// HMAC verify helper (hex)
function verifySignature(rawPayload, signature) {
  try {
    if (!signature || typeof signature !== "string") return false;
    if (!ARIFPAY_KEY || typeof ARIFPAY_KEY !== "string") return false;

    const expected = crypto
      .createHmac("sha256", ARIFPAY_KEY)
      .update(rawPayload, "utf8")
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// Initiate Telebirr B2C via Arifpay
async function telebirrB2C({
  phoneNumber,
  amount,
  reason,
  reference,
  callbackUrl,
}) {
  const payload = {
    phoneNumber, // '0912...'
    amount: Number(amount).toFixed(2), // ETB major units
    reason: reason || "Salary payout",
    reference, // your Payment _id
    callbackUrl, // {API_BASE_URL}/api/payments/webhook/arifpay-payout
  };

  const res = await axios.post(`${ARIFPAY_BASE}/payout/telebirr/b2c`, payload, {
    headers: {
      "Content-Type": "application/json",
      "x-arifpay-key": ARIFPAY_KEY,
    },
  });

  if (!res.data) throw new Error("Arifpay payout failed");
  return res.data; // expect status + transaction ref
}

module.exports = { telebirrB2C, verifySignature };
