import { NextFunction, Request, Response } from "express";
import Product from "../models/Product.model";
import SellerProfile from "../models/SellerProfile.model";
import { IUserDocument } from "../models/User.model";
import * as productService from "../services/product.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Public product search with pagination, filtering and sorting.
 */
export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      page = "1",
      limit = "20",
      category,
      minPrice,
      maxPrice,
      sort,
    } = req.query;

    const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const parsedLimit = Math.min(40, Math.max(1, Number.parseInt(String(limit), 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const query: Record<string, unknown> = {};

    if (q) {
      query.$or = [
        { title: { $regex: String(q), $options: "i" } },
        { tags: { $regex: String(q), $options: "i" } },
      ];
    }

    if (category) {
      query.category = String(category);
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};

      if (minPrice !== undefined) {
        const parsedMinPrice = Number.parseFloat(String(minPrice));
        if (!Number.isNaN(parsedMinPrice)) {
          priceFilter.$gte = parsedMinPrice;
        }
      }

      if (maxPrice !== undefined) {
        const parsedMaxPrice = Number.parseFloat(String(maxPrice));
        if (!Number.isNaN(parsedMaxPrice)) {
          priceFilter.$lte = parsedMaxPrice;
        }
      }

      if (Object.keys(priceFilter).length > 0) {
        query.basePrice = priceFilter;
      }
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };

    switch (String(sort || "")) {
      case "price_asc":
        sortObj = { basePrice: 1 };
        break;
      case "price_desc":
        sortObj = { basePrice: -1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "popular":
        sortObj = { reviewsCount: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select("_id title images basePrice category ratings reviewsCount stock sellerId")
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPrevPage: parsedPage > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Parse text body value into JSON array when multipart payload sends strings.
 */
const parseArrayField = (value: unknown): unknown[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(trimmedValue);
    return Array.isArray(parsedValue) ? parsedValue : undefined;
  } catch (_error) {
    return undefined;
  }
};

/**
 * Parse numeric fields from request body.
 */
const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
};

/**
 * Extract uploaded Cloudinary URLs from multer file collection.
 */
const extractUploadedImageUrls = (files: Request["files"]): string[] => {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  return files
    .map((file) => {
      const maybeFile = file as Express.Multer.File & { path?: string; secure_url?: string };
      return maybeFile.path || maybeFile.secure_url || "";
    })
    .filter(Boolean);
};

/**
 * Build normalized product payload from request body.
 */
const getNormalizedProductPayload = (body: Request["body"]) => {
  return {
    title: body.title,
    description: body.description,
    category: body.category,
    variants: parseArrayField(body.variants),
    tags: parseArrayField(body.tags) as string[] | undefined,
    basePrice: parseOptionalNumber(body.basePrice),
    stock: parseOptionalNumber(body.stock),
  };
};

/**
 * Normalize product id route param to string.
 */
const getProductIdFromParams = (idParam: string | string[] | undefined): string => {
  if (Array.isArray(idParam)) {
    return idParam[0] || "";
  }

  return idParam || "";
};

/**
 * Get paginated public product catalog.
 */
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20", category, minPrice, maxPrice, sort } = req.query;

    const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const parsedLimit = Math.min(40, Math.max(1, Number.parseInt(String(limit), 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const query: Record<string, unknown> = {};

    if (category) {
      query.category = String(category);
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};

      if (minPrice !== undefined) {
        const parsedMinPrice = Number.parseFloat(String(minPrice));
        if (!Number.isNaN(parsedMinPrice)) {
          priceFilter.$gte = parsedMinPrice;
        }
      }

      if (maxPrice !== undefined) {
        const parsedMaxPrice = Number.parseFloat(String(maxPrice));
        if (!Number.isNaN(parsedMaxPrice)) {
          priceFilter.$lte = parsedMaxPrice;
        }
      }

      if (Object.keys(priceFilter).length > 0) {
        query.basePrice = priceFilter;
      }
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };

    switch (String(sort || "newest")) {
      case "price_asc":
        sortObj = { basePrice: 1 };
        break;
      case "price_desc":
        sortObj = { basePrice: -1 };
        break;
      case "popular":
        sortObj = { reviewsCount: -1 };
        break;
      case "newest":
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select("_id title images basePrice category ratings reviewsCount stock sellerId createdAt")
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return sendSuccess(res, "Products fetched", {
      products,
      total,
      page: parsedPage,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get public single product detail.
 */
export const getProductDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getProductIdFromParams(req.params.id);
    const product = await productService.getProductById(productId);

    const sellerProfile = await SellerProfile.findOne({ userId: product.sellerId }).select(
      "storeName storeLogo rating totalSales"
    );

    const productWithSeller = {
      ...product.toObject(),
      seller: sellerProfile
        ? {
            _id: String(product.sellerId),
            storeName: sellerProfile.storeName,
            storeLogo: sellerProfile.storeLogo ?? null,
            rating: sellerProfile.rating,
            totalSales: sellerProfile.totalSales,
          }
        : null,
    };

    return sendSuccess(res, "Product fetched", { product: productWithSeller });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a seller product.
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const sellerId = String(authUser._id);
    const imageUrls = extractUploadedImageUrls(req.files);
    const payload = getNormalizedProductPayload(req.body);
    const product = await productService.createProduct(sellerId, payload, imageUrls);

    return sendSuccess(res, "Product created", { product });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get authenticated seller products.
 */
export const getMyProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const sellerId = String(authUser._id);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await productService.getSellerProducts(sellerId, page, limit);

    return sendSuccess(res, "Products fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get product detail by ID.
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getProductIdFromParams(req.params.id);
    const product = await productService.getProductById(productId);
    return sendSuccess(res, "Product fetched", { product });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update seller-owned product.
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const sellerId = String(authUser._id);
    const productId = getProductIdFromParams(req.params.id);
    const newImageUrls = extractUploadedImageUrls(req.files);
    const payload = getNormalizedProductPayload(req.body);
    const product = await productService.updateProduct(
      productId,
      sellerId,
      payload,
      newImageUrls.length > 0 ? newImageUrls : undefined
    );

    return sendSuccess(res, "Product updated", { product });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete seller-owned product.
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const sellerId = String(authUser._id);
    const productId = getProductIdFromParams(req.params.id);
    await productService.deleteProduct(productId, sellerId);

    return sendSuccess(res, "Product deleted");
  } catch (error) {
    return next(error);
  }
};

/**
 * Get seller listing stats.
 */
export const getSellerStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const sellerId = String(authUser._id);
    const stats = await productService.getSellerStats(sellerId);

    return sendSuccess(res, "Stats fetched", { ...stats });
  } catch (error) {
    return next(error);
  }
};
