import ApiError from '../utils/ApiError.js';

/**
 * Restricts access to the given roles. Must be used after the `protect`
 * middleware so that req.user is already populated.
 *
 * @param  {...string} roles
 * @example router.delete('/:id', protect, restrictTo('admin'), controller)
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('You are not logged in'));
  }

  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }

  next();
};

export default restrictTo;
