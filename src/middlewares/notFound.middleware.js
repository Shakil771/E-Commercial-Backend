import ApiError from '../utils/ApiError.js';

/**
 * Catches any request that doesn't match a defined route and forwards
 * a standardized 404 error to the global error handler.
 */
const notFoundMiddleware = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFoundMiddleware;
