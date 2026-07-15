import express from 'express';
import * as couponController from '../controllers/coupon.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import restrictTo from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createCouponValidator, couponIdValidator } from '../validators/coupon.validator.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect, restrictTo(ROLES.ADMIN));

router.get('/', couponController.getAllCoupons);
router.get('/:id', validate(couponIdValidator), couponController.getCouponById);
router.post('/', validate(createCouponValidator), couponController.createCoupon);
router.patch('/:id', validate(couponIdValidator), couponController.updateCoupon);
router.delete('/:id', validate(couponIdValidator), couponController.deleteCoupon);

export default router;
