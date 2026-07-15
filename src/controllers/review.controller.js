import Review from '../models/Review.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { uploadMultipleToCloudinary, deleteMultipleFromCloudinary } from '../services/cloudinary.service.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';

/**
 * @route   GET /api/v1/admin/reviews
 * @access  Private/Admin
 */
export const getAllReviewsAdmin = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.product) filter.product = req.query.product;

  const { page, limit, skip } = getPaginationParams(req.query, { limit: 20 });

  const [reviews, totalItems] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name email avatar')
      .populate('product', 'name slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  new ApiResponse(200, { reviews }, 'Reviews fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   GET /api/v1/products/:productId/reviews
 * @access  Public
 */
export const getProductReviews = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, { limit: 10 });

  const [reviews, totalItems] = await Promise.all([
    Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ product: req.params.productId }),
  ]);

  new ApiResponse(200, { reviews }, 'Reviews fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   POST /api/v1/products/:productId/reviews
 * @access  Private
 */
export const createReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const existingReview = await Review.findOne({ product: productId, user: req.user._id });
  if (existingReview) {
    throw ApiError.conflict('You have already reviewed this product');
  }

  const deliveredOrder = await Order.findOne({
    user: req.user._id,
    status: ORDER_STATUS.DELIVERED,
    'items.product': productId,
  });

  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleToCloudinary(req.files, 'reviews');
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: deliveredOrder ? deliveredOrder._id : undefined,
    rating,
    title,
    comment,
    images,
    isVerifiedPurchase: Boolean(deliveredOrder),
  });

  new ApiResponse(201, { review }, 'Review submitted successfully').send(res);
});

/**
 * @route   PATCH /api/v1/reviews/:id
 * @access  Private
 */
export const updateReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  if (review.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own reviews');
  }

  const allowedFields = ['rating', 'title', 'comment'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  });

  await review.save();
  await Review.recalculateProductRatings(review.product);

  new ApiResponse(200, { review }, 'Review updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private
 */
export const deleteReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  const isOwner = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to delete this review');
  }

  const imagePublicIds = review.images.map((img) => img.publicId);
  await deleteMultipleFromCloudinary(imagePublicIds);

  await review.deleteOne();
  await Review.recalculateProductRatings(review.product);

  new ApiResponse(200, null, 'Review deleted successfully').send(res);
});
