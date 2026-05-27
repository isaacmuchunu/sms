const Joi = require('joi');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const objectIdValidator = (value, helpers) => {
  if (!UUID_REGEX.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const objectId = () => Joi.string().custom(objectIdValidator);

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const phone = () =>
  Joi.string()
    .trim()
    .pattern(phoneRegex)
    .messages({ 'string.pattern.base': 'Please enter a valid phone number (E.164 format)' });

const pincode = () =>
  Joi.string()
    .trim()
    .pattern(/^\d{5}$/)
    .messages({ 'string.pattern.base': 'Please enter a valid 5-digit postal code' });

const dateString = () => Joi.date().iso();

const status = (values) => Joi.string().valid(...values);

module.exports = {
  objectIdValidator,
  objectId,
  phone,
  pincode,
  dateString,
  status,
};
