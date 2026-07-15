import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs an array of express-validator validation chains, then checks the
 * result. If any validation failed, forwards a 400 ApiError with all
 * field-level messages; otherwise calls next().
 *
 * @param {import('express-validator').ValidationChain[]} validations
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    next(ApiError.badRequest('Validation failed', formattedErrors));
  };
};

export default validate;
