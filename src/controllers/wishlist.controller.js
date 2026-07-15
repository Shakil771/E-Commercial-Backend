import Wishlist from '../models/Wishlist.model.js';
import Product from '../models/Product.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

/**
 * @route   GET /api/v1/wishlist
 * @access  Private
 */
export const getWishlist = catchAsync(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'products',
    match: { isActive: true },
    populate: { path: 'category', select: 'name slug' },
  });

  new ApiResponse(200, { wishlist: wishlist || { products: [] } }, 'Wishlist fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/wishlist/:productId
 * @access  Private
 */
export const addToWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const wishlist = await getOrCreateWishlist(req.user._id);

  const alreadyExists = wishlist.products.some((id) => id.toString() === productId);
  if (alreadyExists) {
    throw ApiError.conflict('Product is already in your wishlist');
  }

  wishlist.products.push(productId);
  await wishlist.save();

  new ApiResponse(200, { wishlist }, 'Product added to wishlist').send(res);
});

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @access  Private
 */
export const removeFromWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await getOrCreateWishlist(req.user._id);
  wishlist.products = wishlist.products.filter((id) => id.toString() !== productId);
  await wishlist.save();

  new ApiResponse(200, { wishlist }, 'Product removed from wishlist').send(res);
});
