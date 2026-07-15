import User from '../models/User.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';

/**
 * @route   PATCH /api/v1/users/profile
 * @access  Private
 */
export const updateProfile = catchAsync(async (req, res) => {
  const allowedFields = ['name', 'phone'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  new ApiResponse(200, { user: user.toSafeObject() }, 'Profile updated successfully').send(res);
});

/**
 * @route   POST /api/v1/users/avatar
 * @access  Private
 */
export const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please upload an image file');
  }

  const user = await User.findById(req.user._id);

  if (user.avatar && user.avatar.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'avatars');

  user.avatar = { url, publicId };
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, { user: user.toSafeObject() }, 'Avatar updated successfully').send(res);
});

/**
 * @route   GET /api/v1/users/addresses
 * @access  Private
 */
export const getAddresses = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  new ApiResponse(200, { addresses: user.addresses }, 'Addresses fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/users/addresses
 * @access  Private
 */
export const addAddress = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  const newAddress = { ...req.body };

  if (newAddress.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    newAddress.isDefault = true;
  }

  user.addresses.push(newAddress);
  await user.save({ validateBeforeSave: true });

  new ApiResponse(201, { addresses: user.addresses }, 'Address added successfully').send(res);
});

/**
 * @route   PATCH /api/v1/users/addresses/:addressId
 * @access  Private
 */
export const updateAddress = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    throw ApiError.notFound('Address not found');
  }

  const allowedFields = [
    'label',
    'fullName',
    'phone',
    'addressLine1',
    'addressLine2',
    'city',
    'state',
    'postalCode',
    'country',
    'isDefault',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) address[field] = req.body[field];
  });

  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      if (addr._id.toString() !== address._id.toString()) addr.isDefault = false;
    });
  }

  await user.save({ validateBeforeSave: true });

  new ApiResponse(200, { addresses: user.addresses }, 'Address updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/users/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    throw ApiError.notFound('Address not found');
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save({ validateBeforeSave: true });

  new ApiResponse(200, { addresses: user.addresses }, 'Address deleted successfully').send(res);
});

/**
 * @route   DELETE /api/v1/users/me
 * @access  Private
 */
export const deactivateAccount = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  new ApiResponse(200, null, 'Account deactivated successfully').send(res);
});
