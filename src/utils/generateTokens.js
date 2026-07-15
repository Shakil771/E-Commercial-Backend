import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Generates a short-lived access token carrying the user id and role.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {string} role
 * @returns {string}
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
};

/**
 * Generates a long-lived refresh token carrying only the user id.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @returns {string}
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
};

/**
 * Verifies an access token and returns its decoded payload.
 * @param {string} token
 * @returns {{id: string, role: string, iat: number, exp: number}}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

/**
 * Verifies a refresh token and returns its decoded payload.
 * @param {string} token
 * @returns {{id: string, iat: number, exp: number}}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

/**
 * Generates both access and refresh tokens for a user.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {string} role
 */
export const generateTokens = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

/**
 * Standard cookie options for setting the refresh token as an httpOnly cookie.
 */
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: env.jwt.cookieExpiresInDays * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};
