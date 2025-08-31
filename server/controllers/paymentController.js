const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const mpesaService = require('../services/mpesaService');
const stripeService = require('../services/stripeService');
const { sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const notificationService = require('../services/notificationService');
const { getSchoolFilter } = require('../middleware/auth');

const normalizePaymentMode = (mode) => {
  if (!mode) return 'online';
  // fee_payments.payment_mode enum does not include mpesa/stripe
  if (mode === 'mpesa' || mode === 'stripe') return 'online';
  return mode;
};

const generateReceiptNo = async (schoolId, tdb = db) => {
  const [{ seq }] = await tdb.raw("SELECT nextval('receipt_no_seq') AS seq");
  return `REC-${String(seq).padStart(6, '0')}`;
};

const canAccessInvoice = async (reqUser, invoice) => {
  if (['admin', 'super_admin', 'principal', 'accountant'].includes(reqUser.role)) return true;

  const studentId = invoice.student_id;
  if (!studentId) return false;

  if (reqUser.role === 'student') {
    const student = await db.findOne('students', { id: studentId, ...getSchoolFilter({ user: reqUser }) });
    return student && String(student.user_id) === String(reqUser.id);
  }

  if (reqUser.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: reqUser.id, ...getSchoolFilter({ user: reqUser }) });
    if (!guardian) return false;
    const links = await db.raw(
      'SELECT 1 FROM student_guardians sg JOIN students s ON sg.student_id = s.id WHERE sg.student_id = $1 AND sg.guardian_id = $2 AND s.school_id = $3 LIMIT 1',
      [studentId, guardian.id, reqUser.school_id]
    );
    return links.length > 0;
  }

  return false;
};

const canAccessPayment = async (reqUser, payment) => {
  if (['admin', 'super_admin', 'principal', 'accountant'].includes(reqUser.role)) return true;

  const studentId = payment.student_id;
  if (!studentId) return false;

  if (reqUser.role === 'student') {
    const student = await db.findOne('students', { id: studentId, ...getSchoolFilter({ user: reqUser }) });
    return student && String(student.user_id) === String(reqUser.id);
  }

  if (reqUser.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: reqUser.id, ...getSchoolFilter({ user: reqUser }) });
    if (!guardian) return false;
    const links = await db.raw(
      'SELECT 1 FROM student_guardians sg JOIN students s ON sg.student_id = s.id WHERE sg.student_id = $1 AND sg.guardian_id = $2 AND s.school_id = $3 LIMIT 1',
      [studentId, guardian.id, reqUser.school_id]
    );
    return links.length > 0;
  }

  return false;
};

const fetchPrimaryGuardian = async (studentId, schoolId) => {
  const rows = await db.raw(
    `SELECT g.* FROM guardians g
     JOIN student_guardians sg ON sg.guardian_id = g.id
     JOIN students s ON sg.student_id = s.id
     WHERE sg.student_id = $1 AND s.school_id = $2
     ORDER BY g.is_primary_contact DESC
     LIMIT 1`,
    [studentId, schoolId]
  );
  return rows[0] || null;
};

const sendPaymentNotifications = async (student, guardian, payment) => {
  try {
    if (guardian?.email) {
      await sendTemplatedEmail('feeReceipt', guardian.email, {
        parentName: `${guardian.first_name} ${guardian.last_name}`,
        studentName: `${student.first_name} ${student.last_name}`,
        amount: Number(payment.amount).toFixed(2),
        receiptNo: payment.receipt_no,
        paidDate: new Date(payment.paid_date).toLocaleDateString(),
        paymentMode: payment.payment_mode,
      });
    }
    if (guardian?.phone) {
      await sendSMS({
        to: guardian.phone,
        message: `Fee payment of ${Number(payment.amount).toFixed(2)} received for ${student.first_name} ${student.last_name}. Receipt: ${payment.receipt_no}.`,
      });
    }
  } catch (err) {
    console.error('Failed to notify guardians about online payment:', err.message);
  }
};

const completePayment = async ({
  invoice,
  amount,
  provider,
  providerTransactionId,
  phoneNumber,
  paidBy,
  paymentMode,
  transactionId,
  tdb = db,
}) => {
  const receiptNo = await generateReceiptNo(invoice.school_id, tdb);

  const payment = await tdb.insert('fee_payments', {
    invoice_id: invoice.id,
    student_id: invoice.student_id,
    amount,
    payment_mode: normalizePaymentMode(paymentMode || provider),
    transaction_id: transactionId || providerTransactionId || '',
    receipt_no: receiptNo,
    collected_by: paidBy,
    status: 'completed',
    paid_date: new Date(),
    school_id: invoice.school_id,
  });

  const totalAmount = Number(invoice.total_amount || 0);
  const concessionAmount = Number(invoice.concession_amount || 0);
  const fineAmount = Number(invoice.fine_amount || 0);
  const netAmount = totalAmount - concessionAmount + fineAmount;
  const newPaidAmount = Number(invoice.paid_amount || 0) + Number(amount);
  const newBalance = Math.max(0, netAmount - newPaidAmount);
  const newStatus = newBalance <= 0 ? 'paid' : 'partial';

  await tdb.update(
    'fee_invoices',
    {
      paid_amount: Math.round(newPaidAmount * 100) / 100,
      balance_amount: Math.round(newBalance * 100) / 100,
      status: newStatus,
    },
    { id: invoice.id }
  );

  // Fire-and-forget in-app notification to student/guardians
  notificationService.getStudentAndGuardianUserIds(invoice.student_id)
    .then((recipientIds) => {
      if (recipientIds.length === 0) return;
      return notificationService.createBulkNotifications({
        recipientIds,
        senderId: paidBy,
        title: 'Fee payment received',
        message: `Payment of ${Number(amount).toFixed(2)} received for invoice ${invoice.invoice_no}. Receipt: ${payment.receipt_no}.`,
        type: 'fee',
        referenceModel: 'fee_payments',
        referenceId: payment.id,
      });
    })
    .catch((err) => console.error('Failed to create payment notifications:', err.message));

  const student = await db.findOne('students', { id: invoice.student_id });
  const guardian = student ? await fetchPrimaryGuardian(student.id, invoice.school_id) : null;

  await sendPaymentNotifications(student, guardian, payment);

  return { payment, student, guardian };
};

// @desc    Initiate M-Pesa STK push
// @route   POST /api/v1/payments/mpesa/initiate
// @access  Private
exports.initiateMpesa = catchAsync(async (req, res) => {
  const { invoice: invoiceId, phoneNumber, amount } = req.body;

  const invoice = await db.findOne('fee_invoices', { id: invoiceId, ...getSchoolFilter(req) });
  if (!invoice) throw new ApiError('Invoice not found', 404);
  if (!(await canAccessInvoice(req.user, invoice))) {
    throw new ApiError('You are not authorized to pay this invoice', 403);
  }
  if (invoice.status === 'cancelled') throw new ApiError('Invoice is cancelled', 409);
  if (invoice.status === 'paid') throw new ApiError('Invoice already paid', 409);
  if (Number(amount) > Number(invoice.balance_amount)) {
    throw new ApiError(`Amount exceeds balance of ${invoice.balance_amount}`, 400);
  }

  const student = await db.findOne('students', { id: invoice.student_id, ...getSchoolFilter(req) });
  const accountReference = process.env.MPESA_ACCOUNT_REFERENCE || `INV-${invoice.invoice_no}`;
  const transactionDesc = `Fee payment for ${student?.first_name || 'Student'} ${student?.last_name || ''}`;

  const stkResponse = await mpesaService.initiateSTKPush({
    amount,
    phoneNumber,
    accountReference,
    transactionDesc,
  });

  const transaction = await db.insert('payment_transactions', {
    invoice_id: invoiceId,
    student_id: invoice.student_id,
    amount,
    provider: 'mpesa',
    merchant_request_id: stkResponse.MerchantRequestID,
    checkout_request_id: stkResponse.CheckoutRequestID,
    phone_number: mpesaService.normalizePhone(phoneNumber),
    status: 'pending',
    paid_by: req.user.id,
    metadata: {},
    school_id: invoice.school_id,
  });

  return ApiResponse.success(
    res,
    { transaction, stkResponse },
    'M-Pesa STK push initiated',
    201
  );
});

// @desc    M-Pesa callback
// @route   POST /api/v1/payments/mpesa/callback
// @access  Public (Safaricom)
exports.mpesaCallback = catchAsync(async (req, res) => {
  // Always acknowledge the callback immediately
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const allowedIps = process.env.MPESA_CALLBACK_IPS
    ? process.env.MPESA_CALLBACK_IPS.split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  if (allowedIps && allowedIps.length > 0) {
    if (!allowedIps.includes(clientIp)) {
      console.warn(`M-Pesa callback rejected from unauthorized IP: ${clientIp}`);
      return;
    }
  } else {
    console.log(`M-Pesa callback received from ${clientIp} — no allowlist configured`);
  }

  const callback = mpesaService.formatCallbackData(req.body);
  const { checkoutRequestId, resultCode, resultDesc, callbackMetadata } = callback;

  if (!checkoutRequestId) return;

  const transaction = await db.findOne('payment_transactions', { checkout_request_id: checkoutRequestId });
  if (!transaction || transaction.status !== 'pending') return;

  await db.update(
    'payment_transactions',
    {
      result_code: String(resultCode),
      result_desc: resultDesc,
      metadata: req.body,
    },
    { id: transaction.id }
  );

  if (resultCode !== 0) {
    await db.update('payment_transactions', { status: 'failed' }, { id: transaction.id });
    return;
  }

  const amount = mpesaService.getCallbackAmount(callbackMetadata);
  const mpesaReceipt = mpesaService.getCallbackMpesaReceipt(callbackMetadata);
  const phone = mpesaService.getCallbackPhone(callbackMetadata);

  if (Number(amount) !== Number(transaction.amount)) {
    await db.update('payment_transactions', { status: 'amount_mismatch' }, { id: transaction.id });
    console.warn(`M-Pesa amount mismatch for transaction ${transaction.id}: expected ${transaction.amount}, got ${amount}`);
    return;
  }

  const invoice = await db.findOne('fee_invoices', { id: transaction.invoice_id });
  if (!invoice) return;

  try {
    await db.transaction(async (tdb) => {
      await tdb.update(
        'payment_transactions',
        {
          status: 'success',
          provider_transaction_id: mpesaReceipt,
          phone_number: phone,
        },
        { id: transaction.id }
      );

      const { payment } = await completePayment({
        invoice,
        amount,
        provider: 'mpesa',
        providerTransactionId: mpesaReceipt,
        phoneNumber: phone,
        paidBy: transaction.paid_by,
        paymentMode: 'mpesa',
        transactionId: mpesaReceipt,
        tdb,
      });

      await tdb.update('payment_transactions', { receipt_no: payment.receipt_no }, { id: transaction.id });
    });
  } catch (err) {
    console.error('Failed to complete M-Pesa payment:', err.message);
  }
});

// @desc    Get M-Pesa payment status
// @route   GET /api/v1/payments/mpesa/status/:checkoutRequestId
// @access  Private
exports.getMpesaStatus = catchAsync(async (req, res) => {
  const { checkoutRequestId } = req.params;
  const transaction = await db.findOne('payment_transactions', { checkout_request_id: checkoutRequestId, ...getSchoolFilter(req) });

  if (!transaction) {
    throw new ApiError('Transaction not found', 404);
  }

  return ApiResponse.success(res, { transaction }, 'Transaction status retrieved');
});

// @desc    Create Stripe PaymentIntent
// @route   POST /api/v1/payments/stripe/intent
// @access  Private
exports.createStripeIntent = catchAsync(async (req, res) => {
  const { invoice: invoiceId, amount } = req.body;

  const invoice = await db.findOne('fee_invoices', { id: invoiceId, ...getSchoolFilter(req) });
  if (!invoice) throw new ApiError('Invoice not found', 404);
  if (!(await canAccessInvoice(req.user, invoice))) {
    throw new ApiError('You are not authorized to pay this invoice', 403);
  }
  if (invoice.status === 'cancelled') throw new ApiError('Invoice is cancelled', 409);
  if (invoice.status === 'paid') throw new ApiError('Invoice already paid', 409);
  if (Number(amount) > Number(invoice.balance_amount)) {
    throw new ApiError(`Amount exceeds balance of ${invoice.balance_amount}`, 400);
  }

  const student = await db.findOne('students', { id: invoice.student_id, ...getSchoolFilter(req) });
  const paymentIntent = await stripeService.createPaymentIntent({
    amount,
    currency: 'kes',
    metadata: {
      invoiceId: invoiceId.toString(),
      studentId: invoice.student_id.toString(),
      userId: req.user.id,
    },
  });

  const transaction = await db.insert('payment_transactions', {
    invoice_id: invoiceId,
    student_id: invoice.student_id,
    amount,
    provider: 'stripe',
    provider_transaction_id: paymentIntent.id,
    status: 'pending',
    paid_by: req.user.id,
    metadata: { clientSecret: paymentIntent.client_secret },
    school_id: invoice.school_id,
  });

  return ApiResponse.success(
    res,
    {
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      paymentIntentId: paymentIntent.id,
    },
    'Stripe PaymentIntent created',
    201
  );
});

// @desc    Handle Stripe webhook
// @route   POST /api/v1/payments/stripe/webhook
// @access  Public (Stripe)
exports.stripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripeService.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { invoiceId, studentId, userId } = intent.metadata || {};
    const amount = intent.amount / 100;

    let transaction = await db.findOne('payment_transactions', {
      provider_transaction_id: intent.id,
    });

    if (!transaction && invoiceId) {
      const invoice = await db.findOne('fee_invoices', { id: invoiceId });
      transaction = await db.insert('payment_transactions', {
        invoice_id: invoiceId,
        student_id: studentId,
        amount,
        provider: 'stripe',
        provider_transaction_id: intent.id,
        status: 'pending',
        paid_by: userId,
        metadata: {},
        school_id: invoice?.school_id,
      });
    }

    if (transaction && transaction.status !== 'success') {
      await db.update('payment_transactions', { status: 'success' }, { id: transaction.id });

      const invoice = await db.findOne('fee_invoices', { id: transaction.invoice_id });
      if (invoice) {
        try {
          const { payment } = await completePayment({
            invoice,
            amount,
            provider: 'stripe',
            providerTransactionId: intent.id,
            paidBy: transaction.paid_by,
            paymentMode: 'card',
            transactionId: intent.id,
          });
          await db.update('payment_transactions', { receipt_no: payment.receipt_no }, { id: transaction.id });
        } catch (err) {
          console.error('Failed to complete Stripe payment:', err.message);
        }
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await db.update(
      'payment_transactions',
      {
        status: 'failed',
        result_desc: intent.last_payment_error?.message || 'Payment failed',
      },
      { provider_transaction_id: intent.id }
    );
  }

  res.status(200).json({ received: true });
});

// @desc    Resend receipt email for a payment
// @route   POST /api/v1/payments/:id/receipt/send
// @access  Private
exports.resendReceipt = catchAsync(async (req, res) => {
  const rows = await db.raw(
    `SELECT fp.*,
            s.first_name AS student_first_name,
            s.last_name AS student_last_name,
            s.admission_no,
            fi.invoice_no
     FROM fee_payments fp
     JOIN students s ON s.id = fp.student_id
     JOIN fee_invoices fi ON fi.id = fp.invoice_id
     WHERE fp.id = $1 AND fp.school_id = $2
     LIMIT 1`,
    [req.params.id, req.user.school_id]
  );

  const payment = rows[0];
  if (!payment) throw new ApiError('Payment not found', 404);
  if (!(await canAccessPayment(req.user, payment))) {
    throw new ApiError('You are not authorized to resend this receipt', 403);
  }

  const student = {
    first_name: payment.student_first_name,
    last_name: payment.student_last_name,
    admission_no: payment.admission_no,
  };
  const guardian = await fetchPrimaryGuardian(payment.student_id, req.user.school_id);

  await sendPaymentNotifications(student, guardian, payment);

  return ApiResponse.success(res, null, 'Receipt sent successfully');
});
