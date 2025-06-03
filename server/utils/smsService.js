const axios = require('axios');

const AFRICAS_TALKING_API_URL = 'https://api.africastalking.com/version1/messaging';

const normalizePhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).trim().replace(/\s+/g, '');
  // If it already starts with +, keep it. Otherwise assume Kenyan format and prepend +254.
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  return `+${cleaned}`;
};

const isSMSEnabled = () => {
  return Boolean(
    process.env.AFRICAS_TALKING_USERNAME && process.env.AFRICAS_TALKING_API_KEY
  );
};

const sendSMS = async ({ to, message }) => {
  const phone = normalizePhone(to);
  if (!phone) {
    throw new Error('SMS recipient phone number is required');
  }
  if (!message) {
    throw new Error('SMS message is required');
  }

  const username = process.env.AFRICAS_TALKING_USERNAME;
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const senderId = process.env.AFRICAS_TALKING_SENDER_ID;

  if (process.env.SKIP_SMS_SEND === 'true') {
    console.log('[SMS FALLBACK]', { to: phone, message });
    return { success: true, fallback: true, to: phone };
  }

  if (!username || !apiKey) {
    const missing = ['AFRICAS_TALKING_USERNAME', 'AFRICAS_TALKING_API_KEY']
      .filter((key) => !process.env[key])
      .join(', ');
    throw new Error(`SMS is not configured. Missing environment variables: ${missing}`);
  }

  const params = new URLSearchParams();
  params.append('username', username);
  params.append('to', phone);
  params.append('message', message);
  if (senderId) {
    params.append('from', senderId);
  }

  try {
    const response = await axios.post(AFRICAS_TALKING_API_URL, params.toString(), {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
      },
      timeout: 30000,
    });
    return {
      success: true,
      to: phone,
      data: response.data,
    };
  } catch (err) {
    const messageText = err.response?.data || err.message;
    console.error('[SMS ERROR]', messageText);
    throw new Error(`Failed to send SMS: ${messageText}`);
  }
};

const sendBulkSMS = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  const results = await Promise.allSettled(
    messages.map((m) => sendSMS({ to: m.to, message: m.message }))
  );
  return results.map((r, idx) => ({
    to: messages[idx].to,
    status: r.status,
    result: r.status === 'fulfilled' ? r.value : r.reason?.message,
  }));
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  normalizePhone,
  isSMSEnabled,
};
