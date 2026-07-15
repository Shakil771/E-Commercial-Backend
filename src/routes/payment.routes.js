import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// NOTE: The webhook route is mounted separately in app.js BEFORE the JSON
// body parser, since Stripe requires the raw request body for signature
// verification. It is not registered here to avoid double-mounting.

router.post('/create-intent', protect, paymentController.createIntent);
router.get('/:orderId/status', protect, paymentController.getPaymentStatus);
router.get('/verify/:paymentIntentId', protect, paymentController.verifyPaymentIntent);

export default router;
