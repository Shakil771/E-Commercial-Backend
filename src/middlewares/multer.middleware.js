import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only JPEG, PNG, WEBP, and GIF image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
});

export const uploadSingleImage = (fieldName) => upload.single(fieldName);
export const uploadMultipleImages = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);

export default upload;
