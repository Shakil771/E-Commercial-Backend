import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../constants/orderStatus.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createOrderValidator = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(Object.values(PAYMENT_METHODS))
    .withMessage(`Payment method must be one of: ${Object.values(PAYMENT_METHODS).join(', ')}`),
  body('couponCode').optional().trim(),
];

export const orderIdValidator = [param('id').custom(isValidObjectId).withMessage('Invalid order id')];

export const updateOrderStatusValidator = [
  param('id').custom(isValidObjectId).withMessage('Invalid order id'),
  body('status').trim().notEmpty().withMessage('Status is required'),
];
