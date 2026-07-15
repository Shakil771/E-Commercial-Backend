import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usageLimitPerUser: {
      type: Number,
      min: 1,
      default: 1,
    },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 1 },
      },
    ],
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Coupon expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

couponSchema.methods.isValid = function isValid() {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.usageLimit != null && this.usedCount >= this.usageLimit) return false;
  return true;
};

couponSchema.methods.calculateDiscount = function calculateDiscount(orderAmount) {
  if (this.discountType === 'percentage') {
    let discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount != null) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
    return Math.round(discount * 100) / 100;
  }
  return Math.min(this.discountValue, orderAmount);
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
