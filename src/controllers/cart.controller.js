import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import Coupon from '../models/Coupon.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Resolves the cart "owner" filter for the current request.
 * - Authenticated requests use { user: req.user._id }.
 * - Guest requests use { sessionId } from the `x-guest-id` header, which the
 *   client generates and persists (e.g. in localStorage) before login.
 */
const resolveOwnerFilter = (req) => {
  if (req.user) return { user: req.user._id };

  const guestId = req.headers['x-guest-id'];
  if (!guestId) {
    throw ApiError.badRequest('A guest session id (x-guest-id header) is required for guest carts');
  }
  return { sessionId: guestId };
};

const getOrCreateCart = async (ownerFilter) => {
  let cart = await Cart.findOne(ownerFilter);
  if (!cart) {
    cart = await Cart.create({ ...ownerFilter, items: [] });
  }
  return cart;
};

const resolveVariantStock = (product, variantId) => {
  if (!variantId) return { stock: product.stock, price: product.finalPrice };
  const variant = product.variants.id(variantId);
  if (!variant) throw ApiError.badRequest('Selected variant no longer exists');
  return { stock: variant.stock, price: variant.price ?? product.finalPrice };
};

/**
 * @route   GET /api/v1/cart
 * @access  Public (guest) / Private (user)
 */
export const getCart = catchAsync(async (req, res) => {
  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);
  new ApiResponse(200, { cart }, 'Cart fetched successfully').send(res);
});

/**
 * @route   POST /api/v1/cart/items
 * @access  Public (guest) / Private (user)
 */
export const addItemToCart = catchAsync(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;

  if (quantity < 1) {
    throw ApiError.badRequest('Quantity must be at least 1');
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const { stock, price } = resolveVariantStock(product, variantId);

  if (stock < quantity) {
    throw ApiError.badRequest(`Only ${stock} unit(s) available in stock`);
  }

  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId && String(item.variantId || '') === String(variantId || '')
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > stock) {
      throw ApiError.badRequest(`Only ${stock} unit(s) available in stock`);
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: product._id,
      variantId: variantId || null,
      name: product.name,
      image: product.images[0]?.url || '',
      price,
      quantity,
    });
  }

  await cart.save();

  new ApiResponse(200, { cart }, 'Item added to cart successfully').send(res);
});

/**
 * @route   PATCH /api/v1/cart/items/:itemId
 * @access  Public (guest) / Private (user)
 */
export const updateCartItem = catchAsync(async (req, res) => {
  const { quantity } = req.body;

  if (quantity < 1) {
    throw ApiError.badRequest('Quantity must be at least 1');
  }

  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);
  const item = cart.items.id(req.params.itemId);

  if (!item) {
    throw ApiError.notFound('Cart item not found');
  }

  const product = await Product.findById(item.product);
  if (!product) {
    throw ApiError.notFound('Product no longer exists');
  }

  const { stock } = resolveVariantStock(product, item.variantId);

  if (quantity > stock) {
    throw ApiError.badRequest(`Only ${stock} unit(s) available in stock`);
  }

  item.quantity = quantity;
  await cart.save();

  new ApiResponse(200, { cart }, 'Cart item updated successfully').send(res);
});

/**
 * @route   DELETE /api/v1/cart/items/:itemId
 * @access  Public (guest) / Private (user)
 */
export const removeCartItem = catchAsync(async (req, res) => {
  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);
  const item = cart.items.id(req.params.itemId);

  if (!item) {
    throw ApiError.notFound('Cart item not found');
  }

  item.deleteOne();
  await cart.save();

  new ApiResponse(200, { cart }, 'Item removed from cart successfully').send(res);
});

/**
 * @route   DELETE /api/v1/cart
 * @access  Public (guest) / Private (user)
 */
export const clearCart = catchAsync(async (req, res) => {
  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);
  cart.items = [];
  cart.coupon = undefined;
  await cart.save();

  new ApiResponse(200, { cart }, 'Cart cleared successfully').send(res);
});

/**
 * @route   POST /api/v1/cart/coupon
 * @access  Public (guest) / Private (user)
 */
export const applyCouponToCart = catchAsync(async (req, res) => {
  const { code } = req.body;

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

  if (!coupon || !coupon.isValid()) {
    throw ApiError.badRequest('Invalid or expired coupon code');
  }

  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);

  if (cart.subtotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(`This coupon requires a minimum order amount of $${coupon.minOrderAmount.toFixed(2)}`);
  }

  if (req.user) {
    const userUsage = coupon.usedBy.find((entry) => entry.user.toString() === req.user._id.toString());
    if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
      throw ApiError.badRequest('You have already used this coupon the maximum number of times');
    }
  }

  cart.coupon = {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };

  await cart.save();

  new ApiResponse(200, { cart }, 'Coupon applied successfully').send(res);
});

/**
 * @route   DELETE /api/v1/cart/coupon
 * @access  Public (guest) / Private (user)
 */
export const removeCouponFromCart = catchAsync(async (req, res) => {
  const ownerFilter = resolveOwnerFilter(req);
  const cart = await getOrCreateCart(ownerFilter);
  cart.coupon = undefined;
  await cart.save();

  new ApiResponse(200, { cart }, 'Coupon removed successfully').send(res);
});

/**
 * @route   POST /api/v1/cart/merge
 * @access  Private
 *
 * Called right after login/register. Merges a guest cart (identified by the
 * `guestId` in the request body, matching the `x-guest-id` the client used
 * before authenticating) into the authenticated user's cart, summing
 * quantities for matching product/variant pairs and capping at available
 * stock. The guest cart document is deleted once merged.
 */
export const mergeGuestCart = catchAsync(async (req, res) => {
  const { guestId } = req.body;

  if (!guestId) {
    const userCart = await getOrCreateCart({ user: req.user._id });
    return new ApiResponse(200, { cart: userCart }, 'No guest cart to merge').send(res);
  }

  const guestCart = await Cart.findOne({ sessionId: guestId });
  const userCart = await getOrCreateCart({ user: req.user._id });

  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await guestCart.deleteOne();
    return new ApiResponse(200, { cart: userCart }, 'No guest cart items to merge').send(res);
  }

  for (const guestItem of guestCart.items) {
    const product = await Product.findById(guestItem.product);
    if (!product || !product.isActive) continue;

    const { stock } = resolveVariantStock(product, guestItem.variantId);

    const existingItem = userCart.items.find(
      (item) =>
        item.product.toString() === guestItem.product.toString() &&
        String(item.variantId || '') === String(guestItem.variantId || '')
    );

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + guestItem.quantity, stock);
    } else {
      userCart.items.push({
        product: guestItem.product,
        variantId: guestItem.variantId,
        name: guestItem.name,
        image: guestItem.image,
        price: guestItem.price,
        quantity: Math.min(guestItem.quantity, stock),
      });
    }
  }

  // Guest coupon (if any) is preserved only if the user cart has none yet
  if (!userCart.coupon?.code && guestCart.coupon?.code) {
    userCart.coupon = guestCart.coupon;
  }

  await userCart.save();
  await guestCart.deleteOne();

  new ApiResponse(200, { cart: userCart }, 'Guest cart merged successfully').send(res);
});
