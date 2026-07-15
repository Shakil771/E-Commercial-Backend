import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';

/**
 * @route   GET /api/v1/categories
 * @access  Public
 */
export const getCategories = catchAsync(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.parent === 'null') filter.parent = null;
  else if (req.query.parent) filter.parent = req.query.parent;

  const categories = await Category.find(filter).populate('subCategories').sort({ name: 1 });

  new ApiResponse(200, { categories }, 'Categories fetched successfully').send(res);
});

/**
 * @route   GET /api/v1/categories/:idOrSlug
 * @access  Public
 */
export const getCategoryByIdOrSlug = catchAsync(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };

  const category = await Category.findOne({ ...query, isActive: true }).populate('subCategories');

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  new ApiResponse(200, { category }, 'Category fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/categories
 * @access  Private/Admin
 */
export const createCategory = catchAsync(async (req, res) => {
  const existing = await Category.findOne({ name: req.body.name });
  if (existing) {
    throw ApiError.conflict('A category with this name already exists');
  }

  let image = { url: '', publicId: '' };
  if (req.file) {
    image = await uploadBufferToCloudinary(req.file.buffer, 'categories');
  }

  const category = await Category.create({ ...req.body, image });

  new ApiResponse(201, { category }, 'Category created successfully').send(res);
});

/**
 * @route   PATCH /api/v1/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  const updates = { ...req.body };

  if (req.file) {
    if (category.image && category.image.publicId) {
      await deleteFromCloudinary(category.image.publicId);
    }
    updates.image = await uploadBufferToCloudinary(req.file.buffer, 'categories');
  }

  Object.assign(category, updates);
  await category.save();

  new ApiResponse(200, { category }, 'Category updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw ApiError.conflict(`Cannot delete category with ${productCount} associated product(s). Reassign or remove them first`);
  }

  const subCategoryCount = await Category.countDocuments({ parent: category._id });
  if (subCategoryCount > 0) {
    throw ApiError.conflict('Cannot delete category with existing subcategories');
  }

  if (category.image && category.image.publicId) {
    await deleteFromCloudinary(category.image.publicId);
  }

  await category.deleteOne();

  new ApiResponse(200, null, 'Category deleted successfully').send(res);
});
