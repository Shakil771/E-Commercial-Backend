import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createOrderValidator, orderIdValidator } from '../validators/order.validator.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createOrderValidator), orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.get('/:id', validate(orderIdValidator), orderController.getOrderById);
router.patch('/:id/cancel', validate(orderIdValidator), orderController.cancelOrder);

export default router;
