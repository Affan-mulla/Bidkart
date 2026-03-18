import { Types } from "mongoose";
import Cart, { ICartItem } from "../models/Cart.model";
import Product from "../models/Product.model";
import AppError from "../utils/appError";

interface CartPayload {
  productId: string;
  quantity: number;
  variantKey?: string;
  variantValue?: string;
}

interface CartResponse {
  items: ICartItem[];
  subtotal: number;
  totalItems: number;
}

/**
 * Compare cart item identity by product and selected variant pair.
 */
const isSameItem = (
  item: ICartItem,
  productId: string,
  variantKey: string,
  variantValue: string
): boolean => {
  return (
    String(item.productId) === productId &&
    (item.variantKey || "") === variantKey &&
    (item.variantValue || "") === variantValue
  );
};

/**
 * Build cart totals from item snapshots.
 */
const buildCartSummary = (items: ICartItem[]): CartResponse => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    subtotal,
    totalItems,
  };
};

/**
 * Return buyer cart and computed totals.
 */
export const getCart = async (userId: string): Promise<CartResponse> => {
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

  if (!cart) {
    return {
      items: [],
      subtotal: 0,
      totalItems: 0,
    };
  }

  return buildCartSummary(cart.items);
};

/**
 * Add an item to cart or increase quantity for an existing variant line.
 */
export const addToCart = async (userId: string, payload: CartPayload): Promise<CartResponse> => {
  const { productId, quantity, variantKey = "", variantValue = "" } = payload;

  if (!productId) {
    throw new AppError("productId is required", 400);
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new AppError("quantity must be at least 1", 400);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.stock < quantity) {
    throw new AppError("Insufficient stock", 400);
  }

  const cart = await Cart.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $setOnInsert: {
        userId: new Types.ObjectId(userId),
        items: [],
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  if (!cart) {
    throw new AppError("Failed to initialize cart", 500);
  }

  const existingIndex = cart.items.findIndex((item) =>
    isSameItem(item, productId, variantKey, variantValue)
  );

  if (existingIndex >= 0) {
    const newQuantity = cart.items[existingIndex].quantity + quantity;

    if (newQuantity > product.stock) {
      throw new AppError("Insufficient stock", 400);
    }

    cart.items[existingIndex].quantity = newQuantity;
  } else {
    cart.items.push({
      productId: product._id,
      sellerId: product.sellerId,
      quantity,
      price: product.basePrice,
      title: product.title,
      image: product.images[0] ?? "",
      variantKey,
      variantValue,
    });
  }

  await cart.save();
  return getCart(userId);
};

/**
 * Update cart item quantity for a specific product-variant line.
 */
export const updateCartItem = async (
  userId: string,
  productId: string,
  variantKey: string,
  variantValue: string,
  quantity: number
): Promise<CartResponse> => {
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

  if (!cart) {
    throw new AppError("Cart not found", 404);
  }

  const itemIndex = cart.items.findIndex((item) =>
    isSameItem(item, productId, variantKey, variantValue)
  );

  if (itemIndex < 0) {
    throw new AppError("Item not found in cart", 404);
  }

  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1);
    await cart.save();
    return getCart(userId);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (quantity > product.stock) {
    throw new AppError("Insufficient stock", 400);
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return getCart(userId);
};

/**
 * Remove a specific product-variant line from cart.
 */
export const removeCartItem = async (
  userId: string,
  productId: string,
  variantKey: string,
  variantValue: string
): Promise<CartResponse> => {
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

  if (!cart) {
    throw new AppError("Cart not found", 404);
  }

  cart.items = cart.items.filter(
    (item) => !isSameItem(item, productId, variantKey, variantValue)
  );

  await cart.save();
  return getCart(userId);
};

/**
 * Clear all items from buyer cart.
 */
export const clearCart = async (userId: string): Promise<void> => {
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

  if (!cart) {
    return;
  }

  cart.items = [];
  await cart.save();
};
