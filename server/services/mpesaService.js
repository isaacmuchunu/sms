const axios = require('axios');
const crypto = require('crypto');

const getBaseUrl = () => {
  const env = process.env.MPESA_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

const getCredentials = () => ({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  passkey: process.env.MPESA_PASSKEY,
  shortcode: process.env.MPESA_SHORTCODE,
  callbackBaseUrl: process.env.MPESA_CALLBACK_BASE_URL,
});

const isConfigured = () => {
  const { consumerKey, consumerSecret, passkey, shortcode, callbackBaseUrl } = getCredentials();
  return !!(consumerKey && consumerSecret && passkey && shortcode && callbackBaseUrl);
};

const getOAuthToken = async () => {
  const { consumerKey, consumerSecret } = getCredentials();
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await axios.get(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 30000,
    }
  );

  return response.data.access_token;
};

const generatePassword = (shortcode, passkey, timestamp) => {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
};

const generateTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
};

const normalizePhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('254')) return cleaned;
  return cleaned;
};

const initiateSTKPush = async ({ amount, phoneNumber, accountReference, transactionDesc, callbackUrl }) => {
  if (!isConfigured()) {
    throw new Error('M-Pesa is not configured. Check environment variables.');
  }

  const { shortcode, passkey, callbackBaseUrl } = getCredentials();
  const token = await getOAuthToken();
  const timestamp = generateTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);
  const partyA = normalizePhone(phoneNumber);
  const finalCallbackUrl = callbackUrl || `${callbackBaseUrl}/api/v1/payments/mpesa/callback`;

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amount),
    PartyA: partyA,
    PartyB: shortcode,
    PhoneNumber: partyA,
    CallBackURL: finalCallbackUrl,
    AccountReference:
      accountReference || process.env.MPESA_ACCOUNT_REFERENCE || 'SchoolFees',
    TransactionDesc: transactionDesc || 'School fee payment',
  };

  const response = await axios.post(
    `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    }
  );

  return response.data;
};

const formatCallbackData = (body) => {
  const result = body?.Body?.stkCallback || {};
  return {
    merchantRequestId: result.MerchantRequestID,
    checkoutRequestId: result.CheckoutRequestID,
    resultCode: result.ResultCode,
    resultDesc: result.ResultDesc,
    callbackMetadata: result.CallbackMetadata?.Item || [],
  };
};

const getCallbackAmount = (callbackMetadata) => {
  const amountItem = callbackMetadata.find((item) => item.Name === 'Amount');
  return amountItem ? Number(amountItem.Value) : 0;
};

const getCallbackMpesaReceipt = (callbackMetadata) => {
  const receiptItem = callbackMetadata.find((item) => item.Name === 'MpesaReceiptNumber');
  return receiptItem ? receiptItem.Value : '';
};

const getCallbackPhone = (callbackMetadata) => {
  const phoneItem = callbackMetadata.find((item) => item.Name === 'PhoneNumber');
  return phoneItem ? String(phoneItem.Value) : '';
};

module.exports = {
  isConfigured,
  getOAuthToken,
  initiateSTKPush,
  formatCallbackData,
  getCallbackAmount,
  getCallbackMpesaReceipt,
  getCallbackPhone,
  normalizePhone,
};
