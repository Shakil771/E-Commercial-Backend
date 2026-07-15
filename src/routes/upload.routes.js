import express from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import restrictTo from '../middlewares/role.middleware.js';
import { uploadSingleImage, uploadMultipleImages } from '../middlewares/multer.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect, restrictTo(ROLES.ADMIN));

router.post('/single', uploadSingleImage('image'), uploadController.uploadSingle);
router.post('/multiple', uploadMultipleImages('images', 10), uploadController.uploadMultiple);
router.delete('/:publicId', uploadController.deleteUpload);

export default router;
