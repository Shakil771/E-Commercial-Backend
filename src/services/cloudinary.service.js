import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Uploads a file buffer to Cloudinary using an upload stream.
 * @param {Buffer} fileBuffer
 * @param {string} folder - Cloudinary folder to organize uploads.
 * @param {object} [options]
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadBufferToCloudinary = (fileBuffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `mern-ecommerce/${folder}`,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          return reject(new ApiError(502, 'Image upload failed'));
        }
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Uploads multiple file buffers concurrently.
 * @param {Array<{buffer: Buffer}>} files
 * @param {string} folder
 */
export const uploadMultipleToCloudinary = async (files, folder) => {
  const uploadPromises = files.map((file) => uploadBufferToCloudinary(file.buffer, folder));
  return Promise.all(uploadPromises);
};

/**
 * Deletes an image from Cloudinary by its public id.
 * @param {string} publicId
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw new ApiError(502, 'Image deletion failed');
  }
};

/**
 * Deletes multiple images from Cloudinary.
 * @param {string[]} publicIds
 */
export const deleteMultipleFromCloudinary = async (publicIds = []) => {
  return Promise.all(publicIds.filter(Boolean).map((id) => deleteFromCloudinary(id)));
};
