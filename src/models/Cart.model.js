import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    items: [cartItemSchema],
    coupon: {
      code: { type: String, trim: true, uppercase: true },
      discountType: { type: String, enum: ['percentage', 'flat'] },
      discountValue: { type: Number, min: 0 },
    },
  },
  { timestamps: true }
);

cartSchema.pre('validate', function ensureOwner(next) {
  if (!this.user && !this.sessionId) {
    return next(new Error('Cart must belong to either a user or a guest session'));
  }
  next();
});

cartSchema.virtual('subtotal').get(function computeSubtotal() {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

cartSchema.virtual('totalItems').get(function computeTotalItems() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
