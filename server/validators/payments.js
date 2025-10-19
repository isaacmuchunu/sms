const Joi = require('joi');
const { objectId } = require('./common');

const mpesaInitiateSchema = Joi.object({
  invoice: objectId().required(),
  phoneNumber: Joi.string().trim().pattern(/^\+?2547\d{8}$/).required()
    .messages({ 'string.pattern.base': 'Please enter a valid Kenyan M-Pesa number (e.g. +254712345678)' }),
  amount: Joi.number().positive().required(),
});

const stripeIntentSchema = Joi.object({
  invoice: objectId().required(),
  amount: Joi.number().positive().required(),
});

const checkoutRequestIdParamSchema = Joi.object({
  checkoutRequestId: Joi.string().trim().required(),
});

const paymentIdParamSchema = Joi.object({
  id: objectId().required(),
});

module.exports = {
  mpesaInitiateSchema,
  stripeIntentSchema,
  checkoutRequestIdParamSchema,
  paymentIdParamSchema,
};
