import Coupon from '../models/Coupon.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

/**
 * @route   POST /api/v1/cart/coupon/validate
 * @access  Private
 */
export const validateCoupon = catchAsync(async (req, res) => {
  const { code } = req.body;

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

  if (!coupon || !coupon.isValid()) {
    throw ApiError.badRequest('Invalid or expired coupon code');
  }

  new ApiResponse(200, {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
  }, 'Coupon is valid').send(res);
});

/**
 * @route   GET /api/v1/admin/coupons
 * @access  Private/Admin
 */
export const getAllCoupons = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { page, limit, skip } = getPaginationParams(req.query, { limit: 20 });

  const [coupons, totalItems] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(filter),
  ]);

  new ApiResponse(200, { coupons }, 'Coupons fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   GET /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const getCouponById = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  new ApiResponse(200, { coupon }, 'Coupon fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/admin/coupons
 * @access  Private/Admin
 */
export const createCoupon = catchAsync(async (req, res) => {
  const existing = await Coupon.findOne({ code: req.body.code.trim().toUpperCase() });
  if (existing) {
    throw ApiError.conflict('A coupon with this code already exists');
  }

  const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });

  new ApiResponse(201, { coupon }, 'Coupon created successfully').send(res);
});

/**
 * @route   PATCH /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  const allowedFields = [
    'description',
    'discountType',
    'discountValue',
    'maxDiscountAmount',
    'minOrderAmount',
    'usageLimit',
    'usageLimitPerUser',
    'validFrom',
    'validUntil',
    'isActive',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) coupon[field] = req.body[field];
  });

  await coupon.save();

  new ApiResponse(200, { coupon }, 'Coupon updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  await coupon.deleteOne();

  new ApiResponse(200, null, 'Coupon deleted successfully').send(res);
});
