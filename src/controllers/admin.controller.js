import User from '../models/User.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import Review from '../models/Review.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/orderStatus.js';
import { ROLES } from '../constants/roles.js';

/**
 * @route   GET /api/v1/admin/dashboard/stats
 * @access  Private/Admin
 */
export const getDashboardStats = catchAsync(async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, totalReviews, revenueResult, pendingOrders, lowStockProducts] = await Promise.all([
    User.countDocuments({ role: ROLES.CUSTOMER }),
    Product.countDocuments(),
    Order.countDocuments(),
    Review.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUS.PAID } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]),
    Order.countDocuments({ status: ORDER_STATUS.PENDING }),
    Product.countDocuments({ stock: { $lte: 10 }, isActive: true }),
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

  new ApiResponse(200, {
    totalUsers,
    totalProducts,
    totalOrders,
    totalReviews,
    totalRevenue,
    pendingOrders,
    lowStockProducts,
  }, 'Dashboard stats fetched successfully').send(res);
});

/**
 * @route   GET /api/v1/admin/dashboard/sales-chart
 * @access  Private/Admin
 */
export const getSalesChart = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        paymentStatus: PAYMENT_STATUS.PAID,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalSales: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  new ApiResponse(200, { salesData }, 'Sales chart data fetched successfully').send(res);
});

/**
 * @route   GET /api/v1/admin/dashboard/top-products
 * @access  Private/Admin
 */
export const getTopSellingProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;

  const topProducts = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.PAID } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
  ]);

  new ApiResponse(200, { topProducts }, 'Top selling products fetched successfully').send(res);
});

/**
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const { page, limit, skip } = getPaginationParams(req.query, { limit: 20 });

  const [users, totalItems] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  new ApiResponse(200, { users }, 'Users fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  new ApiResponse(200, { user }, 'User fetched successfully').send(res);
});

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private/Admin
 */
export const toggleUserStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot change the status of your own account');
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, { user }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`).send(res);
});

/**
 * @route   PATCH /api/v1/admin/users/:id/role
 * @access  Private/Admin
 */
export const updateUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw ApiError.badRequest('Invalid role specified');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, { user }, 'User role updated successfully').send(res);
});
