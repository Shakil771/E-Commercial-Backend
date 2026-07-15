import { body, param } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createReviewValidator = [
  param('productId').custom(isValidObjectId).withMessage('Invalid product id'),
  body('rating').notEmpty().withMessage('Rating is required').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('title').optional().trim().isLength({ max: 120 }).withMessage('Title cannot exceed 120 characters'),
];

export const updateReviewValidator = [
  param('id').custom(isValidObjectId).withMessage('Invalid review id'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
];

export const reviewIdValidator = [param('id').custom(isValidObjectId).withMessage('Invalid review id')];
