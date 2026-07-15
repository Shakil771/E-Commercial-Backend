import express from 'express';
import * as productController from '../controllers/product.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import restrictTo from '../middlewares/role.middleware.js';
import { uploadMultipleImages } from '../middlewares/multer.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/rateLimiter.middleware.js';
import { createProductValidator, updateProductValidator, productIdValidator } from '../validators/product.validator.js';
import { createReviewValidator } from '../validators/review.validator.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.get('/', productController.getProducts);
router.get('/:idOrSlug', productController.getProductByIdOrSlug);
router.get('/:id/related', validate([]), productController.getRelatedProducts);

router.get('/:productId/reviews', reviewController.getProductReviews);
router.post(
  '/:productId/reviews',
  protect,
  writeLimiter,
  uploadMultipleImages('images', 5),
  validate(createReviewValidator),
  reviewController.createReview
);

router.post(
  '/',
  protect,
  restrictTo(ROLES.ADMIN),
  uploadMultipleImages('images', 10),
  validate(createProductValidator),
  productController.createProduct
);

router.patch(
  '/:id',
  protect,
  restrictTo(ROLES.ADMIN),
  uploadMultipleImages('images', 10),
  validate(updateProductValidator),
  productController.updateProduct
);

router.delete(
  '/:id/images/:publicId',
  protect,
  restrictTo(ROLES.ADMIN),
  validate(productIdValidator),
  productController.deleteProductImage
);

router.delete('/:id', protect, restrictTo(ROLES.ADMIN), validate(productIdValidator), productController.deleteProduct);

export default router;
