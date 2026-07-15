import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import * as couponController from '../controllers/coupon.controller.js';
import { attachUserIfPresent, protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { applyCouponValidator } from '../validators/coupon.validator.js';

const router = express.Router();

// Guest carts are allowed: attachUserIfPresent populates req.user only if a
// valid access token is provided, otherwise the controller falls back to
// the `x-guest-id` header for anonymous carts.
router.use(attachUserIfPresent);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItemToCart);
router.patch('/items/:itemId', cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

router.post('/coupon/validate', validate(applyCouponValidator), couponController.validateCoupon);
router.post('/coupon', validate(applyCouponValidator), cartController.applyCouponToCart);
router.delete('/coupon', cartController.removeCouponFromCart);

// Merging requires a fully authenticated user (called right after login/register)
router.post('/merge', protect, cartController.mergeGuestCart);

export default router;
