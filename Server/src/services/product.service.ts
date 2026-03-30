import { Types } from "mongoose";
import Order from "../models/Order.model";
import Product, { IProductDocument } from "../models/Product.model";
import AppError from "../utils/appError";

interface ProductVariantInput {
  key?: unknown;
  value?: unknown;
  images?: unknown;
}

interface ProductInputPayload {
  title?: string;
  description?: string;
  category?: string;
  variants?: ProductVariantInput[];
  basePrice?: number;
  stock?: number;
  tags?: string[];
}

interface NormalizedProductVariant {
  key: string;
  value: string;
  images: string[];
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

interface MonthlyMostSoldProduct {
  _id: Types.ObjectId;
  title: string;
  images: string[];
  basePrice: number;
  category: string;
  ratings: number;
  reviewsCount: number;
  stock: number;
  sellerId: Types.ObjectId;
  createdAt: Date;
  totalUnitsSold: number;
  totalRevenue: number;
  ordersCount: number;
}

interface MonthlyMostSoldResult {
  products: MonthlyMostSoldProduct[];
  period: {
    start: string;
    end: string;
  };
  total: number;
}

const VALID_SALES_STATUSES = ["Confirmed", "Packed", "Shipped", "Delivered"] as const;

/**
 * Get the first moment of the current month in UTC.
 */
const getCurrentMonthStartUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
};

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
 * Normalize variants and ensure each item has both key and value.
 */
const normalizeVariants = (
  variants: ProductVariantInput[] | undefined,
  options: { requireAtLeastOne: boolean }
): NormalizedProductVariant[] => {
  if (!Array.isArray(variants)) {
    if (options.requireAtLeastOne) {
      throw new AppError("At least one variant is required", 400);
    }

    return [];
  }

  const normalized = variants
    .map((variant) => {
      const key = typeof variant?.key === "string" ? variant.key.trim() : "";
      const value = typeof variant?.value === "string" ? variant.value.trim() : "";
      const images = Array.isArray(variant?.images)
        ? variant.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
        : [];

      return {
        key,
        value,
        images,
      };
    })
    .filter((variant) => variant.key.length > 0 || variant.value.length > 0);

  if (normalized.some((variant) => !variant.key || !variant.value)) {
    throw new AppError("Each variant must include both key and value", 400);
  }

  if (options.requireAtLeastOne && normalized.length === 0) {
    throw new AppError("At least one variant is required", 400);
  }

  return normalized;
};

/**
 * Ensure variants are image-complete when variant mode is active.
 */
const validateVariantImageCompleteness = (variants: NormalizedProductVariant[]) => {
  const hasVariantWithoutImages = variants.some((variant) => variant.images.length === 0);

  if (hasVariantWithoutImages) {
    throw new AppError("Each variant must include at least one image", 400);
  }
};

/**
 * Validate mutually exclusive image mode at creation time.
 */
const validateCreateImageMode = (variants: NormalizedProductVariant[], imageUrls: string[]) => {
  const hasVariants = variants.length > 0;
  const hasProductImages = imageUrls.length > 0;

  if (hasVariants && hasProductImages) {
    throw new AppError("Use either variant images or product images, not both", 400);
  }

  if (hasVariants) {
    validateVariantImageCompleteness(variants);
    return;
  }

  if (!hasProductImages) {
    throw new AppError("At least one product image is required when variants are not provided", 400);
  }
};

/**
 * Pick a stable cover image for variant-mode products.
 */
const getVariantCoverImage = (variants: NormalizedProductVariant[]): string => {
  const firstVariantImage = variants.find((variant) => variant.images.length > 0)?.images[0];
  return firstVariantImage || "";
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
  const normalizedVariants = normalizeVariants(data.variants, { requireAtLeastOne: false });
  validateCreateImageMode(normalizedVariants, imageUrls);
  const hasVariants = normalizedVariants.length > 0;

  const title = data.title?.trim() || "";
  const category = data.category?.trim() || "";

  const product = await Product.create({
    sellerId: new Types.ObjectId(sellerId),
    title,
    description: data.description?.trim() ?? "",
    images: hasVariants ? [getVariantCoverImage(normalizedVariants)] : imageUrls,
    category,
    variants: normalizedVariants,
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

  const hasNewProductImages = Boolean(newImageUrls && newImageUrls.length > 0);

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

  let nextVariants = product.variants as unknown as NormalizedProductVariant[];

  if (data.variants !== undefined) {
    nextVariants = normalizeVariants(data.variants, { requireAtLeastOne: false });
    product.variants = nextVariants;
  }

  if (data.tags !== undefined) {
    product.tags = Array.isArray(data.tags) ? data.tags : [];
  }

  if (hasNewProductImages) {
    product.images = newImageUrls as string[];
  }

  const hasVariantsAfterUpdate = nextVariants.length > 0;

  if (hasVariantsAfterUpdate && hasNewProductImages) {
    throw new AppError("Use either variant images or product images, not both", 400);
  }

  if (hasVariantsAfterUpdate) {
    validateVariantImageCompleteness(nextVariants);
    product.images = [getVariantCoverImage(nextVariants)];
  } else if (product.images.length === 0) {
    throw new AppError("At least one product image is required when variants are not provided", 400);
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

/**
 * Get public most sold products for the current month.
 */
export const getMonthlyMostSoldProducts = async (limit = 8): Promise<MonthlyMostSoldResult> => {
  const parsedLimit = Math.max(1, Math.min(40, Number(limit) || 8));
  const periodStart = getCurrentMonthStartUtc();
  const periodEnd = new Date();

  const aggregationRows = await Order.aggregate<{
    products: MonthlyMostSoldProduct[];
    meta: Array<{ total: number }>;
  }>([
    {
      $match: {
        createdAt: {
          $gte: periodStart,
          $lte: periodEnd,
        },
        // "Placed" is intentionally excluded to avoid counting tentative checkouts.
        status: { $in: [...VALID_SALES_STATUSES] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        totalUnitsSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.itemTotal" },
        orderIds: { $addToSet: "$_id" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: "$product._id",
        title: "$product.title",
        images: "$product.images",
        basePrice: "$product.basePrice",
        category: "$product.category",
        ratings: "$product.ratings",
        reviewsCount: "$product.reviewsCount",
        stock: "$product.stock",
        sellerId: "$product.sellerId",
        createdAt: "$product.createdAt",
        totalUnitsSold: 1,
        totalRevenue: 1,
        ordersCount: { $size: "$orderIds" },
      },
    },
    {
      $facet: {
        products: [
          {
            $sort: {
              totalUnitsSold: -1,
              totalRevenue: -1,
              createdAt: -1,
            },
          },
          { $limit: parsedLimit },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const result = aggregationRows[0] || { products: [], meta: [] };
  const total = result.meta[0]?.total || 0;

  return {
    products: result.products,
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    total,
  };
};
