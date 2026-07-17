import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import Coupon from '../models/Coupon.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { ORDER_STATUS, ORDER_STATUS_FLOW, PAYMENT_STATUS, PAYMENT_METHODS } from '../constants/orderStatus.js';
import { sendEmail, buildOrderConfirmationEmail } from '../services/email.service.js';
import { createPaymentIntent } from '../services/payment.service.js';

const SHIPPING_FLAT_RATE = 10;
const FREE_SHIPPING_THRESHOLD = 100;
const TAX_RATE = 0.08;

const decrementStock = async (session, productId, variantId, quantity) => {
  const product = await Product.findById(productId).session(session);

  if (!product) {
    throw ApiError.badRequest('One or more products in your order are no longer available');
  }

  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant || variant.stock < quantity) {
      throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
    }
    variant.stock -= quantity;
  } else {
    if (product.stock < quantity) {
      throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
    }
    product.stock -= quantity;
  }

  await product.save({ session });
};

const restockItems = async (order) => {
  await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) return;

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) variant.stock += item.quantity;
      } else {
        product.stock += item.quantity;
      }
      await product.save();
    })
  );
};

/**
 * @route   POST /api/v1/orders
 * @access  Private
 */
export const createOrder = catchAsync(async (req, res) => {

  const { shippingAddress, paymentMethod, couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  const itemsPrice = Math.round(cart.subtotal * 100) / 100;

  let discountAmount = 0;
  let appliedCoupon = null;

  const effectiveCouponCode = couponCode || cart.coupon?.code;

  if (effectiveCouponCode) {
    const coupon = await Coupon.findOne({ code: effectiveCouponCode.trim().toUpperCase() });

    if (!coupon || !coupon.isValid()) {
      throw ApiError.badRequest('Invalid or expired coupon code');
    }

    if (itemsPrice < coupon.minOrderAmount) {
      throw ApiError.badRequest(`This coupon requires a minimum order amount of $${coupon.minOrderAmount.toFixed(2)}`);
    }

    const userUsage = coupon.usedBy.find((entry) => entry.user.toString() === req.user._id.toString());
    if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
      throw ApiError.badRequest('You have already used this coupon the maximum number of times');
    }

    discountAmount = coupon.calculateDiscount(itemsPrice);
    appliedCoupon = coupon;
  }

  const shippingPrice = itemsPrice - discountAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const taxableAmount = Math.max(itemsPrice - discountAmount, 0);
  const taxPrice = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const totalPrice = Math.round((taxableAmount + shippingPrice + taxPrice) * 100) / 100;

  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      for (const item of cart.items) {
        await decrementStock(session, item.product, item.variantId, item.quantity);
        // await decrementStock(session, item.product, item.variantId, item.quantity);

      }

      const [order] = await Order.create(
        [
          {
            user: req.user._id,
            items: cart.items.map((item) => ({
              product: item.product,
              variantId: item.variantId,
              name: item.name,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
            })),
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            taxPrice,
            discountAmount,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            totalPrice,
            paymentStatus: paymentMethod === PAYMENT_METHODS.COD ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PENDING,
            statusHistory: [{ status: ORDER_STATUS.PENDING, changedBy: req.user._id }],
          },
        ],
        { session }
      );


      if (appliedCoupon) {
        const userUsage = appliedCoupon.usedBy.find((entry) => entry.user.toString() === req.user._id.toString());
        if (userUsage) {
          userUsage.count += 1;
        } else {
          appliedCoupon.usedBy.push({ user: req.user._id, count: 1 });
        }
        appliedCoupon.usedCount += 1;

        await appliedCoupon.save({ session });

      }

      createdOrder = order;


    });


  } finally {
    session.endSession();
  }

  cart.items = [];
  cart.coupon = undefined;
  await cart.save();

  let clientSecret = null;
  if (paymentMethod === PAYMENT_METHODS.CARD) {
    const paymentIntent = await createPaymentIntent(Math.round(totalPrice * 100), 'usd', {
      orderId: createdOrder._id.toString(),
      orderNumber: createdOrder.orderNumber,
    });
    clientSecret = paymentIntent.client_secret;
  }

  try {
    const { subject, html } = buildOrderConfirmationEmail(req.user.name, createdOrder);
    await sendEmail({ to: req.user.email, subject, html });
  } catch (error) {
    // Non-fatal: order creation should not fail due to email issues
  }

  new ApiResponse(201, { order: createdOrder, clientSecret }, 'Order created successfully').send(res);
});

/**
 * @route   GET /api/v1/orders
 * @access  Private
 */
export const getMyOrders = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, { limit: 10 });
  const filter = { user: req.user._id };

  if (req.query.status) filter.status = req.query.status;

  const [orders, totalItems] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  new ApiResponse(200, { orders }, 'Orders fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
export const getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to view this order');
  }

  new ApiResponse(200, { order }, 'Order fetched successfully').send(res);
});

/**
 * @route   PATCH /api/v1/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const isOwner = order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to cancel this order');
  }

  if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order.status)) {
    throw ApiError.badRequest(`Orders with status "${order.status}" cannot be cancelled`);
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelReason = req.body.reason || 'Cancelled by user';
  order.statusHistory.push({ status: ORDER_STATUS.CANCELLED, note: order.cancelReason, changedBy: req.user._id });

  await order.save();
  await restockItems(order);

  new ApiResponse(200, { order }, 'Order cancelled successfully').send(res);
});

/**
 * @route   GET /api/v1/admin/orders
 * @access  Private/Admin
 */
export const getAllOrders = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  const { page, limit, skip } = getPaginationParams(req.query, { limit: 20 });

  const [orders, totalItems] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  new ApiResponse(200, { orders }, 'Orders fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
  const { status, note, trackingNumber } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const allowedNextStatuses = ORDER_STATUS_FLOW[order.status] || [];

  if (!allowedNextStatuses.includes(status)) {
    throw ApiError.badRequest(`Cannot transition order from "${order.status}" to "${status}"`);
  }

  order.status = status;
  order.statusHistory.push({ status, note, changedBy: req.user._id });

  if (status === ORDER_STATUS.SHIPPED && trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  if (status === ORDER_STATUS.DELIVERED) {
    order.isDelivered = true;
    order.deliveredAt = new Date();
    if (order.paymentMethod === PAYMENT_METHODS.COD) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = PAYMENT_STATUS.PAID;
    }
  }

  if (status === ORDER_STATUS.CANCELLED) {
    await restockItems(order);
  }

  await order.save();

  new ApiResponse(200, { order }, 'Order status updated successfully').send(res);
});
