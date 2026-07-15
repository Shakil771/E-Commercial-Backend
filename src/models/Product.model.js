import mongoose from 'mongoose';
import slugify from 'slugify';

const specificationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    sku: { type: String, trim: true },
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        _id: false,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function validateDiscount(value) {
          return value == null || value < this.price;
        },
        message: 'Discount price must be less than the regular price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    variants: [variantSchema],
    specifications: [specificationSchema],
    tags: [{ type: String, trim: true, lowercase: true }],
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ slug: 1 });

productSchema.pre('save', function generateSlugAndSku(next) {
  if (this.isModified('name')) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${Date.now().toString(36)}`;
  }
  next();
});

productSchema.virtual('finalPrice').get(function computeFinalPrice() {
  return this.discountPrice != null ? this.discountPrice : this.price;
});

productSchema.virtual('discountPercentage').get(function computeDiscount() {
  if (this.discountPrice == null || this.price === 0) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

productSchema.virtual('inStock').get(function computeInStock() {
  return this.stock > 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

export default Product;
