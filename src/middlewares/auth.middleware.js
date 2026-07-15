import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/generateTokens.js';
import User from '../models/User.model.js';

/**
 * Protects routes by requiring a valid JWT access token.
 * Accepts the token from the Authorization header ("Bearer <token>").
 * Attaches the authenticated user to req.user.
 */
export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('You are not logged in. Please log in to access this resource');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please log in again');
    }
    throw ApiError.unauthorized('Invalid authentication token');
  }

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    throw ApiError.unauthorized('The user belonging to this token no longer exists');
  }

  if (!currentUser.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support');
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw ApiError.unauthorized('Password was recently changed. Please log in again');
  }

  req.user = currentUser;
  next();
});

/**
 * Optionally attaches req.user if a valid token is present, but does not
 * throw if the request is unauthenticated. Useful for public routes that
 * behave slightly differently for logged-in users (e.g. wishlist state).
 */
export const attachUserIfPresent = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.isActive && !currentUser.changedPasswordAfter(decoded.iat)) {
      req.user = currentUser;
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth routes
  }

  next();
});
