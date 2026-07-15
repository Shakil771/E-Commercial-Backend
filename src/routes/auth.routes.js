import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updatePasswordValidator,
} from '../validators/auth.validator.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerValidator), authController.register);
router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);

router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', protect, authController.resendVerificationEmail);

router.post('/forgot-password', authLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordValidator), authController.resetPassword);
router.patch('/update-password', protect, validate(updatePasswordValidator), authController.updatePassword);

router.get('/me', protect, authController.getMe);

export default router;
