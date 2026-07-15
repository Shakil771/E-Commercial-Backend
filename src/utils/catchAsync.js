/**
 * Wraps an async Express route handler and forwards any rejected promise
 * to the global error handling middleware via next(err).
 * Eliminates the need for repetitive try/catch blocks in controllers.
 *
 * @param {Function} fn - async (req, res, next) => {}
 * @returns {Function} Express middleware
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
