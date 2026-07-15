import connectDB from '../config/db.js';
import logger from './logger.js';
import User from '../models/User.model.js';
import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';
import Coupon from '../models/Coupon.model.js';
import { ROLES } from '../constants/roles.js';
import slugify from 'slugify';

/**
 * Seeds the database with a baseline admin user, sample categories,
 * and sample products for local development.
 *
 * Usage: npm run seed          -> seeds data (skips existing)
 *        npm run seed -- --fresh -> wipes and reseeds all collections
 */
const run = async () => {
  await connectDB();

  const isFresh = process.argv.includes('--fresh');

  if (isFresh) {
    logger.info('Fresh flag detected: clearing existing collections');
    await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({})]);
  }

  const existingAdmin = await User.findOne({ role: ROLES.ADMIN });

  let admin = existingAdmin;
  if (!admin) {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@mernshop.com',
      password: 'Admin@12345',
      role: ROLES.ADMIN,
      isEmailVerified: true,
    });
    logger.info(`Created admin user: ${admin.email} / Admin@12345`);
  } else {
    logger.info('Admin user already exists, skipping creation');
  }


  const categoryDefs = [
    { name: 'Electronics', description: 'Phones, laptops, gadgets and accessories' },
    { name: 'Fashion', description: 'Clothing, footwear, and accessories' },
    { name: 'Home & Living', description: 'Furniture, decor, and household essentials' },
    { name: 'Sports & Outdoors', description: 'Fitness gear and outdoor equipment' },
  ];

  const categories = [];
  for (const def of categoryDefs) {
    let category = await Category.findOne({ name: def.name });
    if (!category) {
      category = await Category.create(def);
      logger.info(`Created category: ${category.name}`);
    }
    categories.push(category);
  }

  const existingProductCount = await Product.countDocuments();
  if (existingProductCount === 0) {
    const sampleProducts = [
      {
        name: 'Wireless Noise Cancelling Headphones',
        description:
          'Premium over-ear wireless headphones with active noise cancellation, 30-hour battery life, and plush memory foam ear cushions for all-day comfort.',
        shortDescription: 'Premium wireless headphones with ANC and 30h battery',
        brand: 'SoundCore',
        category: categories[0]._id,
        images: [{ url: 'https://via.placeholder.com/600x600.png?text=Headphones', publicId: 'placeholder_headphones' }],
        price: 149.99,
        discountPrice: 119.99,
        stock: 50,
        sku: 'ELEC-HEAD-001',
        tags: ['audio', 'wireless', 'headphones'],
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Smart Fitness Watch',
        description:
          'Track your heart rate, sleep, steps, and workouts with this water-resistant smart fitness watch featuring a vibrant AMOLED display and 7-day battery life.',
        shortDescription: 'AMOLED fitness watch with 7-day battery life',
        brand: 'FitTrack',
        category: categories[0]._id,
        images: [{ url: 'https://via.placeholder.com/600x600.png?text=Smart+Watch', publicId: 'placeholder_watch' }],
        price: 89.99,
        stock: 75,
        sku: 'ELEC-WATCH-002',
        tags: ['wearable', 'fitness', 'watch'],
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: "Men's Classic Denim Jacket",
        description:
          'A timeless denim jacket crafted from durable cotton twill, featuring a classic button-front closure and multiple pockets for everyday wear.',
        shortDescription: 'Timeless cotton denim jacket for everyday wear',
        brand: 'UrbanFit',
        category: categories[1]._id,
        images: [{ url: 'https://via.placeholder.com/600x600.png?text=Denim+Jacket', publicId: 'placeholder_jacket' }],
        price: 59.99,
        stock: 40,
        sku: 'FASH-JACK-001',
        variants: [
          { size: 'M', color: 'Blue', sku: 'FASH-JACK-001-M-BLU', price: 59.99, stock: 15 },
          { size: 'L', color: 'Blue', sku: 'FASH-JACK-001-L-BLU', price: 59.99, stock: 15 },
          { size: 'XL', color: 'Blue', sku: 'FASH-JACK-001-XL-BLU', price: 62.99, stock: 10 },
        ],
        tags: ['jacket', 'denim', 'menswear'],
        createdBy: admin._id,
      },
      {
        name: 'Modern Ceramic Table Lamp',
        description:
          'Add a warm, contemporary touch to any room with this handcrafted ceramic table lamp, featuring a linen shade and a soft-glow LED-compatible socket.',
        shortDescription: 'Handcrafted ceramic lamp with linen shade',
        brand: 'HomeGlow',
        category: categories[2]._id,
        images: [{ url: 'https://via.placeholder.com/600x600.png?text=Table+Lamp', publicId: 'placeholder_lamp' }],
        price: 45.0,
        stock: 30,
        sku: 'HOME-LAMP-001',
        tags: ['lighting', 'decor', 'lamp'],
        createdBy: admin._id,
      },
      {
        name: 'Adjustable Dumbbell Set',
        description:
          'A space-saving adjustable dumbbell set that replaces 15 pairs of weights, ranging from 5 to 52.5 lbs per dumbbell, perfect for home workouts.',
        shortDescription: 'Space-saving adjustable dumbbells, 5-52.5 lbs',
        brand: 'IronCore',
        category: categories[3]._id,
        images: [{ url: 'https://via.placeholder.com/600x600.png?text=Dumbbells', publicId: 'placeholder_dumbbells' }],
        price: 299.99,
        discountPrice: 249.99,
        stock: 20,
        sku: 'SPORT-DUMB-001',
        tags: ['fitness', 'gym', 'dumbbells'],
        isFeatured: true,
        createdBy: admin._id,
      },
    ];

    const productsWithSlug = sampleProducts.map((product) => ({
      ...product,
      slug: `${slugify(product.name, {
        lower: true,
        strict: true,
      })}-${Math.random().toString(36).slice(2, 8)}`, 
    }));

    await Product.insertMany(productsWithSlug);
    logger.info(`Seeded ${productsWithSlug.length} sample products`);

  } else {
    logger.info('Products already exist, skipping product seeding');
  }

  const existingCoupon = await Coupon.findOne({ code: 'WELCOME10' });
  if (!existingCoupon) {
    await Coupon.create({
      code: 'WELCOME10',
      description: '10% off your first order (max $50 discount)',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 20,
      maxDiscountAmount: 50,
      usageLimitPerUser: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
    });
    logger.info('Created coupon: WELCOME10');
  } else {
    logger.info('Coupon WELCOME10 already exists, skipping');
  }

  logger.info('Seeding complete');
  process.exit(0);
};

run().catch((error) => {
  logger.error(`Seeding failed: ${error.message}`);
  process.exit(1);
});
