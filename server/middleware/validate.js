const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Middleware factory to validate request data against a Joi schema.
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @param {string} source - Request property to validate: 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // For query parameters, allow unknown keys (e.g. schoolId filter for super_admin)
    // while still validating/coercing known ones.
    const isQuery = source === 'query';
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: !isQuery,
      allowUnknown: isQuery,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('. ');
      return next(new ApiError(message, 400));
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;
