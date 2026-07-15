import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as paymentController from '../controllers/payment.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import restrictTo from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { updateOrderStatusValidator, orderIdValidator } from '../validators/order.validator.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect, restrictTo(ROLES.ADMIN));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/sales-chart', adminController.getSalesChart);
router.get('/dashboard/top-products', adminController.getTopSellingProducts);

// Products (admin listing with full filters, reuses productController)
router.get('/products', productController.getAllProductsAdmin);

// Orders
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', validate(orderIdValidator), orderController.getOrderById);
router.patch('/orders/:id/status', validate(updateOrderStatusValidator), orderController.updateOrderStatus);
router.post('/payments/:orderId/refund', paymentController.refundPayment);

// Reviews
router.get('/reviews', reviewController.getAllReviewsAdmin);
router.delete('/reviews/:id', reviewController.deleteReview);

// Users
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);

export default router;
