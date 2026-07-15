import Stripe from 'stripe';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Creates a Stripe PaymentIntent for the given order amount.
 * Amount must be provided in the smallest currency unit (e.g. cents).
 *
 * @param {number} amountInCents
 * @param {string} currency
 * @param {object} metadata
 */
export const createPaymentIntent = async (amountInCents, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountInCents),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
    return paymentIntent;
  } catch (error) {
    throw new ApiError(502, `Payment provider error: ${error.message}`);
  }
};

/**
 * Retrieves a PaymentIntent by id from Stripe.
 * @param {string} paymentIntentId
 */
export const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    throw new ApiError(502, `Payment provider error: ${error.message}`);
  }
};

/**
 * Issues a refund for a previously captured payment.
 * @param {string} paymentIntentId
 * @param {number} [amountInCents] - Partial refund amount; full refund if omitted.
 */
export const createRefund = async (paymentIntentId, amountInCents) => {
  try {
    const refundPayload = { payment_intent: paymentIntentId };
    if (amountInCents) refundPayload.amount = Math.round(amountInCents);
    return await stripe.refunds.create(refundPayload);
  } catch (error) {
    throw new ApiError(502, `Refund failed: ${error.message}`);
  }
};

/**
 * Verifies and constructs a Stripe webhook event from the raw request body.
 * @param {Buffer} rawBody
 * @param {string} signature
 */
export const constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
};

export default stripe;
