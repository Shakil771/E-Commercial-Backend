import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const handleCastErrorDB = (err) => {
  return ApiError.badRequest(`Invalid value for field "${err.path}": ${err.value}`);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : '';
  return ApiError.conflict(`${field} "${value}" already exists. Please use a different value`);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return ApiError.badRequest('Validation failed', errors);
};

const handleJWTError = () => ApiError.unauthorized('Invalid token. Please log in again');

const handleJWTExpiredError = () => ApiError.unauthorized('Your token has expired. Please log in again');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    message: err.message,
    errors: err.errors || [],
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors && err.errors.length > 0 ? err.errors : undefined,
    });
  }

  logger.error(`UNEXPECTED ERROR: ${err.message}`, { stack: err.stack });
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Something went wrong. Please try again later',
  });
};

/**
 * Global error handling middleware. Must be registered last, after all routes.
 * Converts known Mongoose/JWT errors into ApiError instances before responding.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let error = err;
  error.statusCode = error.statusCode || 500;
  error.message = error.message || 'Internal Server Error';

  if (!(error instanceof ApiError)) {
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    else if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    else if (error.name === 'JsonWebTokenError') error = handleJWTError();
    else if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    else {
      const wrapped = new ApiError(error.statusCode, error.message);
      wrapped.isOperational = false;
      wrapped.stack = err.stack;
      error = wrapped;
    }
  }

  logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);

  if (env.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export default errorMiddleware;
