import crypto from 'crypto';

export const createHashedToken = () => {
  const token = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return {
    token,
    hashedToken,
  };
};

export const createEmailVerificationToken = () => {
  const { token, hashedToken } = createHashedToken();

  return {
    token,
    hashedToken,
    expires: Date.now() + 10 * 60 * 1000, // 10 Minutes
  };
};

export const createPasswordResetToken = () => {
  const { token, hashedToken } = createHashedToken();

  return {
    token,
    hashedToken,
    expires: Date.now() + 10 * 60 * 1000, // 10 Minutes
  };
};

export const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};