const Stripe = require('stripe');

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return new Stripe(secretKey);
};

const isConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};

const createPaymentIntent = async ({ amount, currency = 'kes', metadata = {} }) => {
  const stripe = getStripe();
  const amountInCents = Math.round(amount * 100);

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata,
  });
};

const retrievePaymentIntent = async (id) => {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(id);
};

const constructEvent = (payload, signature, secret) => {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
};

module.exports = {
  isConfigured,
  createPaymentIntent,
  retrievePaymentIntent,
  constructEvent,
};
