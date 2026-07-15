import { body, param } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 150 }).withMessage('Name cannot exceed 150 characters'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .custom(isValidObjectId)
    .withMessage('Invalid category id'),
  body('price').notEmpty().withMessage('Price is required').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number'),
  body('stock').notEmpty().withMessage('Stock is required').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('brand').optional().trim(),
  body('tags').optional(),
];

export const updateProductValidator = [
  param('id').custom(isValidObjectId).withMessage('Invalid product id'),
  body('name').optional().trim().isLength({ max: 150 }).withMessage('Name cannot exceed 150 characters'),
  body('category').optional().custom(isValidObjectId).withMessage('Invalid category id'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

export const productIdValidator = [param('id').custom(isValidObjectId).withMessage('Invalid product id')];
