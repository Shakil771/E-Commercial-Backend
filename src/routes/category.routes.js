import express from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import restrictTo from '../middlewares/role.middleware.js';
import { uploadSingleImage } from '../middlewares/multer.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.get('/', categoryController.getCategories);
router.get('/:idOrSlug', categoryController.getCategoryByIdOrSlug);

router.post('/', protect, restrictTo(ROLES.ADMIN), uploadSingleImage('image'), categoryController.createCategory);
router.patch('/:id', protect, restrictTo(ROLES.ADMIN), uploadSingleImage('image'), categoryController.updateCategory);
router.delete('/:id', protect, restrictTo(ROLES.ADMIN), categoryController.deleteCategory);

export default router;
