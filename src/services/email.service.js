import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port:Number(env.smtp.port),
  secure: true,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

/**
 * Sends an email using the configured SMTP transport.
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

export const buildEmailVerificationEmail = (name, verificationUrl) => ({
  subject: 'Verify your email address',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name},</h2>
      <p>Thanks for creating an account. Please verify your email address by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${verificationUrl}" style="background-color:#111827;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
      </p>
      <p>This link will expire in 10 minutes. If you did not create this account, you can safely ignore this email.</p>
    </div>
  `,
});

export const buildPasswordResetEmail = (name, resetUrl) => ({
  subject: 'Reset your password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color:#111827;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      </p>
      <p>This link will expire in 10 minutes. If you did not request this, please ignore this email and your password will remain unchanged.</p>
    </div>
  `,
});

export const buildOrderConfirmationEmail = (name, order) => ({
  subject: `Order Confirmation - ${order.orderNumber}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name},</h2>
      <p>Thank you for your order! Your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:8px;">Item</th>
            <th style="text-align:center; border-bottom:1px solid #e5e7eb; padding:8px;">Qty</th>
            <th style="text-align:right; border-bottom:1px solid #e5e7eb; padding:8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #f3f4f6;">${item.name}</td>
              <td style="padding:8px; text-align:center; border-bottom:1px solid #f3f4f6;">${item.quantity}</td>
              <td style="padding:8px; text-align:right; border-bottom:1px solid #f3f4f6;">$${item.price.toFixed(2)}</td>
            </tr>`
            )
            .join('')}
        </tbody> 
      </table>
      <p><strong>Total: $${order.totalPrice.toFixed(2)}</strong></p>
      <p>We will notify you again once your order has shipped.</p>
    </div>
  `,
});

export default transporter;
