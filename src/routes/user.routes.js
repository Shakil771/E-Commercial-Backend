import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadSingleImage } from '../middlewares/multer.middleware.js';

const router = express.Router();

router.use(protect);

router.patch('/profile', userController.updateProfile);
router.post('/avatar', uploadSingleImage('avatar'), userController.updateAvatar);
router.delete('/me', userController.deactivateAccount);

router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.patch('/addresses/:addressId', userController.updateAddress);
router.delete('/addresses/:addressId', userController.deleteAddress);

export default router;
