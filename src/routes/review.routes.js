import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { updateReviewValidator, reviewIdValidator } from '../validators/review.validator.js';

const router = express.Router();

router.use(protect);

router.patch('/:id', validate(updateReviewValidator), reviewController.updateReview);
router.delete('/:id', validate(reviewIdValidator), reviewController.deleteReview);

export default router;
