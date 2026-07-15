import mongoose from 'mongoose';
import Product from './Product.model.js';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        _id: false,
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.statics.recalculateProductRatings = async function recalculateProductRatings(productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        ratingsAverage: { $avg: '$rating' },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: stats[0].ratingsAverage,
      ratingsCount: stats[0].ratingsCount,
      numReviews: stats[0].ratingsCount,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: 0,
      ratingsCount: 0,
      numReviews: 0,
    });
  }
};

reviewSchema.post('save', async function afterSave() {
  await this.constructor.recalculateProductRatings(this.product);
});

reviewSchema.post('findOneAndDelete', async function afterDelete(doc) {
  if (doc) {
    await doc.constructor.recalculateProductRatings(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
