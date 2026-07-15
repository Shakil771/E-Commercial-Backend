import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { uploadMultipleToCloudinary, deleteMultipleFromCloudinary } from '../services/cloudinary.service.js';

const buildProductFilter = (query) => {
  const filter = { isActive: true };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.brand) {
    filter.brand = { $regex: new RegExp(query.brand, 'i') };
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.minRating) {
    filter.ratingsAverage = { $gte: Number(query.minRating) };
  }

  if (query.inStock === 'true') {
    filter.stock = { $gt: 0 };
  }

  if (query.featured === 'true') {
    filter.isFeatured = true;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
};

const buildSortOption = (sortParam) => {
  const sortMap = {
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'rating-desc': { ratingsAverage: -1 },
    'name-asc': { name: 1 },
    'name-desc': { name: -1 },
    popular: { numReviews: -1 },
  };

  return sortMap[sortParam] || { createdAt: -1 };
};

/**
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getProducts = catchAsync(async (req, res) => {
  const filter = buildProductFilter(req.query);
  const sort = buildSortOption(req.query.sort);
  const { page, limit, skip } = getPaginationParams(req.query, { limit: 12 });

  const [products, totalItems] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  new ApiResponse(200, { products }, 'Products fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});

/**
 * @route   GET /api/v1/products/:idOrSlug
 * @access  Public
 */
export const getProductByIdOrSlug = catchAsync(async (req, res) => {
  const { idOrSlug } = req.params;

  const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

  const product = await Product.findOne({ ...query, isActive: true }).populate('category', 'name slug');

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  new ApiResponse(200, { product }, 'Product fetched successfully').send(res);
});

/**
 * @route   GET /api/v1/products/:id/related
 * @access  Public
 */
export const getRelatedProducts = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(8)
    .populate('category', 'name slug');

  new ApiResponse(200, { products: relatedProducts }, 'Related products fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/products
 * @access  Private/Admin
 */
export const createProduct = catchAsync(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) {
    throw ApiError.badRequest('Invalid category specified');
  }

  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleToCloudinary(req.files, 'products');
  }

  const productData = {
    ...req.body,
    images,
    createdBy: req.user._id,
  };

  if (typeof productData.tags === 'string') {
    productData.tags = productData.tags.split(',').map((tag) => tag.trim().toLowerCase());
  }

  if (typeof productData.specifications === 'string') {
    productData.specifications = JSON.parse(productData.specifications);
  }

  if (typeof productData.variants === 'string') {
    productData.variants = JSON.parse(productData.variants);
  }

  const product = await Product.create(productData);

  new ApiResponse(201, { product }, 'Product created successfully').send(res);
});

/**
 * @route   PATCH /api/v1/products/:id
 * @access  Private/Admin
 */
export const updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      throw ApiError.badRequest('Invalid category specified');
    }
  }

  const updates = { ...req.body };

  if (typeof updates.tags === 'string') {
    updates.tags = updates.tags.split(',').map((tag) => tag.trim().toLowerCase());
  }

  if (typeof updates.specifications === 'string') {
    updates.specifications = JSON.parse(updates.specifications);
  }

  if (typeof updates.variants === 'string') {
    updates.variants = JSON.parse(updates.variants);
  }

  if (req.files && req.files.length > 0) {
    const newImages = await uploadMultipleToCloudinary(req.files, 'products');
    updates.images = [...product.images, ...newImages];
  }

  Object.assign(product, updates);
  await product.save();

  new ApiResponse(200, { product }, 'Product updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/products/:id/images/:publicId
 * @access  Private/Admin
 */
export const deleteProductImage = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const { publicId } = req.params;
  const decodedPublicId = decodeURIComponent(publicId);

  const imageExists = product.images.some((img) => img.publicId === decodedPublicId);
  if (!imageExists) {
    throw ApiError.notFound('Image not found on this product');
  }

  await deleteMultipleFromCloudinary([decodedPublicId]);
  product.images = product.images.filter((img) => img.publicId !== decodedPublicId);
  await product.save();

  new ApiResponse(200, { product }, 'Product image removed successfully').send(res);
});

/**
 * @route   DELETE /api/v1/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const publicIds = product.images.map((img) => img.publicId);
  await deleteMultipleFromCloudinary(publicIds);

  await product.deleteOne();

  new ApiResponse(200, null, 'Product deleted successfully').send(res);
});

/**
 * @route   GET /api/v1/admin/products
 * @access  Private/Admin
 */
export const getAllProductsAdmin = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { page, limit, skip } = getPaginationParams(req.query, { limit: 20 });

  const [products, totalItems] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  new ApiResponse(200, { products }, 'Products fetched successfully', buildPaginationMeta(totalItems, page, limit)).send(res);
});
