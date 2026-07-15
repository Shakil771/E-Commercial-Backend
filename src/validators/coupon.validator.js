import { body, param } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createCouponValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters'),
  body('discountType').notEmpty().isIn(['percentage', 'flat']).withMessage('Discount type must be percentage or flat'),
  body('discountValue').notEmpty().isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('validUntil').notEmpty().withMessage('Expiry date is required').isISO8601().withMessage('Expiry date must be a valid date'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be a positive number'),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }).withMessage('Max discount amount must be a positive number'),
  body('usageLimit').optional().isInt({ min: 1 }).withMessage('Usage limit must be a positive integer'),
];

export const applyCouponValidator = [body('code').trim().notEmpty().withMessage('Coupon code is required')];

export const couponIdValidator = [param('id').custom(isValidObjectId).withMessage('Invalid coupon id')];
