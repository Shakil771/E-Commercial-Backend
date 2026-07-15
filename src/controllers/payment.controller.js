import Order from '../models/Order.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { createPaymentIntent, retrievePaymentIntent, createRefund, constructWebhookEvent } from '../services/payment.service.js';
import { PAYMENT_STATUS } from '../constants/orderStatus.js';
import logger from '../utils/logger.js';

/**
 * @route   POST /api/v1/payments/create-intent
 * @access  Private
 */
export const createIntent = catchAsync(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You do not have permission to pay for this order');
  }

  if (order.isPaid) {
    throw ApiError.badRequest('This order has already been paid for');
  }

  const paymentIntent = await createPaymentIntent(Math.round(order.totalPrice * 100), 'usd', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
  });

  new ApiResponse(200, { clientSecret: paymentIntent.client_secret }, 'Payment intent created successfully').send(res);
});

/**
 * @route   GET /api/v1/payments/:orderId/status
 * @access  Private
 */
export const getPaymentStatus = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('You do not have permission to view this payment status');
  }

  new ApiResponse(200, {
    isPaid: order.isPaid,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
  }, 'Payment status fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/admin/payments/:orderId/refund
 * @access  Private/Admin
 */
export const refundPayment = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (!order.isPaid || !order.paymentResult?.id) {
    throw ApiError.badRequest('This order has not been paid, so it cannot be refunded');
  }

  const amountInCents = req.body.amount ? Math.round(req.body.amount * 100) : undefined;
  await createRefund(order.paymentResult.id, amountInCents);

  order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  order.statusHistory.push({ status: 'refunded', note: 'Payment refunded', changedBy: req.user._id });
  await order.save();

  new ApiResponse(200, { order }, 'Payment refunded successfully').send(res);
});

/**
 * @route   POST /api/v1/payments/webhook
 * @access  Public (verified via Stripe signature)
 *
 * NOTE: this route must receive the raw request body (see app.js), not JSON-parsed.
 */
export const stripeWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (error) {
    logger.error(`Stripe webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const { orderId } = paymentIntent.metadata;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentStatus = PAYMENT_STATUS.PAID;
          order.paymentResult = {
            id: paymentIntent.id,
            status: paymentIntent.status,
            updateTime: new Date().toISOString(),
            email: paymentIntent.receipt_email || '',
          };
          await order.save();
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const { orderId } = paymentIntent.metadata;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = PAYMENT_STATUS.FAILED;
          await order.save();
        }
      }
      break;
    }

    default:
      logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

// Exported for potential polling-based status checks from the client
export const verifyPaymentIntent = catchAsync(async (req, res) => {
  const paymentIntent = await retrievePaymentIntent(req.params.paymentIntentId);
  new ApiResponse(200, { status: paymentIntent.status }, 'Payment intent status fetched').send(res);
});
