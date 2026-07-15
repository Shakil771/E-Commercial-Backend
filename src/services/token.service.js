import RefreshToken from '../models/RefreshToken.model.js';
import { generateTokens, verifyRefreshToken } from '../utils/generateTokens.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Issues a new access/refresh token pair for a user and persists
 * a hash of the refresh token so it can be revoked or rotated later.
 */
export const issueTokenPair = async (user, meta = {}) => {
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  const expiresAt = new Date(Date.now() + env.jwt.cookieExpiresInDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: RefreshToken.hashToken(refreshToken),
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

/**
 * Rotates a refresh token: verifies the presented token, ensures it hasn't
 * been revoked/reused, revokes it, and issues a brand new pair.
 */
export const rotateRefreshToken = async (presentedToken, meta = {}) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(presentedToken);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = RefreshToken.hashToken(presentedToken);
  const storedToken = await RefreshToken.findOne({ tokenHash, user: decoded.id });

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is no longer valid, please log in again');
  }

  storedToken.isRevoked = true;
  await storedToken.save();

  return decoded.id;
};

/**
 * Revokes a single refresh token (used on logout).
 */
export const revokeRefreshToken = async (presentedToken) => {
  if (!presentedToken) return;
  const tokenHash = RefreshToken.hashToken(presentedToken);
  await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
};

/**
 * Revokes all refresh tokens for a user (used on password change or "logout everywhere").
 */
export const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};
