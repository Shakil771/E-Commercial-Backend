import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadBufferToCloudinary, uploadMultipleToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';

/**
 * @route   POST /api/v1/uploads/single
 * @access  Private/Admin
 */
export const uploadSingle = catchAsync(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please provide an image file');
  }

  const folder = req.body.folder || 'misc';
  const result = await uploadBufferToCloudinary(req.file.buffer, folder);

  new ApiResponse(201, { image: result }, 'Image uploaded successfully').send(res);
});

/**
 * @route   POST /api/v1/uploads/multiple
 * @access  Private/Admin
 */
export const uploadMultiple = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('Please provide at least one image file');
  }

  const folder = req.body.folder || 'misc';
  const results = await uploadMultipleToCloudinary(req.files, folder);

  new ApiResponse(201, { images: results }, 'Images uploaded successfully').send(res);
});

/**
 * @route   DELETE /api/v1/uploads/:publicId
 * @access  Private/Admin
 */
export const deleteUpload = catchAsync(async (req, res) => {
  const decodedPublicId = decodeURIComponent(req.params.publicId);
  await deleteFromCloudinary(decodedPublicId);

  new ApiResponse(200, null, 'Image deleted successfully').send(res);
});
