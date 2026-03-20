import { Types } from "mongoose";
import Product from "../models/Product.model";
import User from "../models/User.model";
import AppError from "../utils/appError";

/**
 * Validate MongoDB object id.
 */
const ensureObjectId = (value: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
};

/**
 * Add product to user wishlist.
 */
export const addToWishlist = async (userId: string, productId: string) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(productId, "Invalid product id");

  const product = await Product.findById(productId).select("_id");
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { wishlist: new Types.ObjectId(productId) },
  });

  return { message: "Added to wishlist" };
};

/**
 * Remove product from user wishlist.
 */
export const removeFromWishlist = async (userId: string, productId: string) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(productId, "Invalid product id");

  await User.findByIdAndUpdate(userId, {
    $pull: { wishlist: new Types.ObjectId(productId) },
  });

  return { message: "Removed from wishlist" };
};

/**
 * Fetch paginated wishlist for buyer.
 */
export const getWishlist = async (userId: string, page: number, limit: number) => {
  ensureObjectId(userId, "Invalid user id");

  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 10));

  const user = await User.findById(userId)
    .populate({
      path: "wishlist",
      select: "_id title images basePrice category ratings reviewsCount stock sellerId",
    })
    .select("wishlist");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const items = user.wishlist as unknown as Record<string, unknown>[];
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / parsedLimit));
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginatedProducts = items.slice(startIndex, startIndex + parsedLimit);

  return {
    items: paginatedProducts,
    total,
    page: parsedPage,
    totalPages,
  };
};
