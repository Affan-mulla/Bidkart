import { Types } from "mongoose";
import Product, { IProductDocument } from "../models/Product.model";
import AppError from "../utils/appError";

interface ProductInputPayload {
  title?: string;
  description?: string;
  category?: string;
  variants?: unknown[];
  basePrice?: number;
  stock?: number;
  tags?: string[];
}

interface SellerProductsResult {
  products: IProductDocument[];
  total: number;
  page: number;
  totalPages: number;
}

interface SellerStatsResult {
  totalListings: number;
  totalStockValue: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentProducts: IProductDocument[];
}

/**
 * Validate required fields for product creation.
 */
const validateCreatePayload = (data: ProductInputPayload) => {
  if (!data.title || !data.title.trim()) {
    throw new AppError("Product title is required", 400);
  }

  if (!data.category || !data.category.trim()) {
    throw new AppError("Product category is required", 400);
  }

  if (typeof data.basePrice !== "number" || Number.isNaN(data.basePrice) || data.basePrice < 0) {
    throw new AppError("basePrice must be a number greater than or equal to 0", 400);
  }

  if (typeof data.stock !== "number" || Number.isNaN(data.stock) || data.stock < 0) {
    throw new AppError("stock must be a number greater than or equal to 0", 400);
  }
};

/**
 * Create a new seller product.
 */
export const createProduct = async (
  sellerId: string,
  data: ProductInputPayload,
  imageUrls: string[]
): Promise<IProductDocument> => {
  validateCreatePayload(data);

  const title = data.title?.trim() || "";
  const category = data.category?.trim() || "";

  const product = await Product.create({
    sellerId: new Types.ObjectId(sellerId),
    title,
    description: data.description?.trim() ?? "",
    images: imageUrls,
    category,
    variants: Array.isArray(data.variants) ? data.variants : [],
    basePrice: data.basePrice,
    stock: data.stock,
    tags: Array.isArray(data.tags) ? data.tags : [],
  });

  return product;
};

/**
 * Fetch paginated products for a seller.
 */
export const getSellerProducts = async (
  sellerId: string,
  page: number,
  limit: number
): Promise<SellerProductsResult> => {
  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(100, limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const query = { sellerId: new Types.ObjectId(sellerId) };

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

  return {
    products,
    total,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fetch a product by ID.
 */
export const getProductById = async (productId: string): Promise<IProductDocument> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError("Product not found", 404);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

/**
 * Ensure product belongs to seller.
 */
const ensureOwnership = (product: IProductDocument, sellerId: string) => {
  if (String(product.sellerId) !== sellerId) {
    throw new AppError("Forbidden", 403);
  }
};

/**
 * Update an existing seller product.
 */
export const updateProduct = async (
  productId: string,
  sellerId: string,
  data: ProductInputPayload,
  newImageUrls?: string[]
): Promise<IProductDocument> => {
  const product = await getProductById(productId);
  ensureOwnership(product, sellerId);

  if (data.title !== undefined) {
    if (!data.title.trim()) {
      throw new AppError("Product title cannot be empty", 400);
    }
    product.title = data.title.trim();
  }

  if (data.description !== undefined) {
    product.description = data.description.trim();
  }

  if (data.category !== undefined) {
    if (!data.category.trim()) {
      throw new AppError("Product category cannot be empty", 400);
    }
    product.category = data.category.trim();
  }

  if (data.basePrice !== undefined) {
    if (typeof data.basePrice !== "number" || Number.isNaN(data.basePrice) || data.basePrice < 0) {
      throw new AppError("basePrice must be a number greater than or equal to 0", 400);
    }
    product.basePrice = data.basePrice;
  }

  if (data.stock !== undefined) {
    if (typeof data.stock !== "number" || Number.isNaN(data.stock) || data.stock < 0) {
      throw new AppError("stock must be a number greater than or equal to 0", 400);
    }
    product.stock = data.stock;
  }

  if (data.variants !== undefined) {
    product.variants = Array.isArray(data.variants) ? data.variants : [];
  }

  if (data.tags !== undefined) {
    product.tags = Array.isArray(data.tags) ? data.tags : [];
  }

  if (newImageUrls && newImageUrls.length > 0) {
    product.images = newImageUrls;
  }

  await product.save();
  return product;
};

/**
 * Delete a seller product.
 */
export const deleteProduct = async (productId: string, sellerId: string): Promise<void> => {
  const product = await getProductById(productId);
  ensureOwnership(product, sellerId);
  await Product.deleteOne({ _id: product._id });
};

/**
 * Get seller inventory stats and recent products.
 */
export const getSellerStats = async (sellerId: string): Promise<SellerStatsResult> => {
  const sellerObjectId = new Types.ObjectId(sellerId);

  const [statsAgg, recentProducts] = await Promise.all([
    Product.aggregate<{
      totalListings: number;
      totalStockValue: number;
      totalUnits: number;
      lowStockCount: number;
      outOfStockCount: number;
    }>([
      { $match: { sellerId: sellerObjectId } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          totalStockValue: { $sum: { $multiply: ["$basePrice", "$stock"] } },
          totalUnits: { $sum: "$stock" },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", 5] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ["$stock", 0] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalListings: 1,
          totalStockValue: 1,
          totalUnits: 1,
          lowStockCount: 1,
          outOfStockCount: 1,
        },
      },
    ]),
    Product.find({ sellerId: sellerObjectId }).sort({ createdAt: -1 }).limit(5),
  ]);

  const stats = statsAgg[0] || {
    totalListings: 0,
    totalStockValue: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  return {
    totalListings: stats.totalListings,
    totalStockValue: stats.totalStockValue,
    totalUnits: stats.totalUnits,
    lowStockCount: stats.lowStockCount,
    outOfStockCount: stats.outOfStockCount,
    recentProducts,
  };
};
