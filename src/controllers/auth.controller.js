import User from '../models/User.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/token.service.js';
import { refreshTokenCookieOptions } from '../utils/generateTokens.js';
import { sendEmail, buildEmailVerificationEmail, buildPasswordResetEmail } from '../services/email.service.js';
import env from '../config/env.js';
import { createEmailVerificationToken, hashToken } from '../utils/token.utils.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const respondWithAuth = async (res, statusCode, user, message) => {
  const { accessToken, refreshToken } = await issueTokenPair(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshTokenCookieOptions);

  return new ApiResponse(
    statusCode,
    {
      user: user.toSafeObject(),
      accessToken,
    },
    message
  ).send(res);
};

/**
 * @route   POST /api/v1/auth/register
 * @access  Public
 */


export const register = catchAsync(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, phone });

  const {
    token: verificationToken,
    hashedToken,
    expires,
  } = createEmailVerificationToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expires;

  await user.save({ validateBeforeSave: false, });

  const verificationUrl = `${env.clientUrl}/verify-email/${verificationToken}`;
  const { subject, html } = buildEmailVerificationEmail(user.name, verificationUrl);
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch (error) {
    // await User.findByIdAndDelete(user._id);
    // throw ApiError.internal('Failed to send verification email. Please try again.');
    console.log('Failed to send verification email. Please try again.')
  } 

  new ApiResponse(201, {
    email: user.email,
  },
    'Registration successful. Please check your email to verify your account.'
  ).send(res);

  // await respondWithAuth(res, 201, user, 'Registration successful. Please check your email to verify your account');
});

/**
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support');
  }

  await respondWithAuth(res, 200, user, 'Login successful');
});

/**
 * @route   POST /api/v1/auth/refresh
 * @access  Public (requires valid refresh token cookie)
 */
export const refresh = catchAsync(async (req, res) => {
  const presentedToken = req.cookies[REFRESH_COOKIE_NAME];

  if (!presentedToken) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const userId = await rotateRefreshToken(presentedToken);
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is inactive');
  }

  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshTokenCookieOptions);

  new ApiResponse(200, { accessToken }, 'Token refreshed successfully').send(res);
});

/**
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = catchAsync(async (req, res) => {
  const presentedToken = req.cookies[REFRESH_COOKIE_NAME];
  await revokeRefreshToken(presentedToken);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

  new ApiResponse(200, null, 'Logged out successfully').send(res);
});

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const hashedToken = hashToken(req.params.token);
  console.log(hashedToken)
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  console.log(hashedToken, user)

  if (!user) {
    throw ApiError.badRequest('Verification link is invalid or has expired');
  }

  user.isActive = true;
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, { user: user.toSafeObject() }, 'Email verified successfully').send(res);
});

/**
 * @route   POST /api/v1/auth/resend-verification
 * @access  Private
 */
export const resendVerificationEmail = catchAsync(async (req, res) => {
  const user = req.user;

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Your email is already verified');
  }

  // const verificationToken = user.createEmailVerificationToken();

  const {
    token: verificationToken,
    hashedToken,
    expires,
  } = createEmailVerificationToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expires;

  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${env.clientUrl}/verify-email/${verificationToken}`;
  const { subject, html } = buildEmailVerificationEmail(user.name, verificationUrl);
  await sendEmail({ to: user.email, subject, html });

  new ApiResponse(200, null, 'Verification email sent').send(res);
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Do not reveal whether the email exists
    return new ApiResponse(200, null, 'If an account with that email exists, a reset link has been sent').send(res);
  }

  // const resetToken = user.createPasswordResetToken();
  const {
    token: resetToken,
    hashedToken,
    expires,
  } = createPasswordResetToken();

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.clientUrl}/reset-password/${resetToken}`;
  const { subject, html } = buildPasswordResetEmail(user.name, resetUrl);

  try {
    await sendEmail({ to: user.email, subject, html });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal('Failed to send password reset email. Please try again later');
  }

  new ApiResponse(200, null, 'If an account with that email exists, a reset link has been sent').send(res);
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw ApiError.badRequest('Password reset link is invalid or has expired');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await revokeAllUserTokens(user._id);

  await respondWithAuth(res, 200, user, 'Password reset successful. You are now logged in');
});

/**
 * @route   PATCH /api/v1/auth/update-password
 * @access  Private
 */
export const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  await revokeAllUserTokens(user._id);

  await respondWithAuth(res, 200, user, 'Password updated successfully');
});

/**
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = catchAsync(async (req, res) => {
  new ApiResponse(200, { user: req.user.toSafeObject() }, 'Current user fetched').send(res);
});
