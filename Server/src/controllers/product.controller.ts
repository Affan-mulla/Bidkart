import { NextFunction, Request, Response } from "express";
import Product from "../models/Product.model";
import SellerProfile from "../models/SellerProfile.model";
import { IUserDocument } from "../models/User.model";
import * as exportService from "../services/export.service";
import * as productService from "../services/product.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

interface ParsedVariantPayload {
  key: string;
  value: string;
  images: string[];
}

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
        { "variants.key": { $regex: String(q), $options: "i" } },
        { "variants.value": { $regex: String(q), $options: "i" } },
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
        .select("_id title images variants basePrice category ratings reviewsCount stock sellerId")
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
 * Parse variants into normalized object array.
 */
const parseVariantsField = (value: unknown): ParsedVariantPayload[] | undefined => {
  const parsedArray = parseArrayField(value);

  if (parsedArray === undefined) {
    return undefined;
  }

  return parsedArray
    .map((variant) => {
      const maybeVariant = variant as { key?: unknown; value?: unknown; images?: unknown };

      return {
        key: typeof maybeVariant.key === "string" ? maybeVariant.key.trim() : "",
        value: typeof maybeVariant.value === "string" ? maybeVariant.value.trim() : "",
        images: Array.isArray(maybeVariant.images)
          ? maybeVariant.images.filter(
              (image): image is string => typeof image === "string" && image.trim().length > 0
            )
          : [],
      };
    })
    .filter((variant) => variant.key.length > 0 || variant.value.length > 0);
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
    .filter((file) => file.fieldname === "images")
    .map((file) => {
      const maybeFile = file as Express.Multer.File & { path?: string; secure_url?: string };
      return maybeFile.path || maybeFile.secure_url || "";
    })
    .filter(Boolean);
};

/**
 * Group uploaded variant image URLs by variant index from field names like variantImages.0.
 */
const extractUploadedVariantImageMap = (files: Request["files"]): Record<number, string[]> => {
  if (!files || !Array.isArray(files)) {
    return {};
  }

  return files.reduce<Record<number, string[]>>((accumulator, file) => {
    const matched = file.fieldname.match(/^variantImages[.-](\d+)$/i);

    if (!matched) {
      return accumulator;
    }

    const variantIndex = Number.parseInt(matched[1], 10);

    if (Number.isNaN(variantIndex)) {
      return accumulator;
    }

    const maybeFile = file as Express.Multer.File & { path?: string; secure_url?: string };
    const fileUrl = maybeFile.path || maybeFile.secure_url || "";

    if (!fileUrl) {
      return accumulator;
    }

    if (!accumulator[variantIndex]) {
      accumulator[variantIndex] = [];
    }

    accumulator[variantIndex].push(fileUrl);
    return accumulator;
  }, {});
};

/**
 * Extract shared variant image URLs from field name sharedVariantImages.
 */
const extractUploadedSharedVariantImageUrls = (files: Request["files"]): string[] => {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  return files
    .filter((file) => file.fieldname === "sharedVariantImages")
    .map((file) => {
      const maybeFile = file as Express.Multer.File & { path?: string; secure_url?: string };
      return maybeFile.path || maybeFile.secure_url || "";
    })
    .filter(Boolean);
};

/**
 * Parse tags from JSON array or comma-separated text.
 */
const parseTagsField = (value: unknown): string[] | undefined => {
  const parsedArray = parseArrayField(value);

  if (parsedArray) {
    return parsedArray
      .filter((item): item is string => typeof item === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
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
    variants: parseVariantsField(body.variants),
    tags: parseTagsField(body.tags),
    basePrice: parseOptionalNumber(body.basePrice),
    stock: parseOptionalNumber(body.stock),
  };
};

/**
 * Apply uploaded variant image URLs to parsed variants by index.
 */
const applyVariantImages = (
  variants: ParsedVariantPayload[] | undefined,
  files: Request["files"]
): ParsedVariantPayload[] | undefined => {
  if (!variants) {
    return variants;
  }

  const variantImageMap = extractUploadedVariantImageMap(files);
  const sharedVariantImages = extractUploadedSharedVariantImageUrls(files);

  return variants.map((variant, index) => {
    const uploadedImages = variantImageMap[index] || [];

    if (uploadedImages.length > 0) {
      return {
        ...variant,
        images: uploadedImages,
      };
    }

    if (sharedVariantImages.length === 0) {
      return variant;
    }

    return {
      ...variant,
      images: sharedVariantImages,
    };
  });
};

/**
 * Validate that variant image uploads are only used when variants are supplied.
 */
const assertVariantUploadConsistency = (
  variants: ParsedVariantPayload[] | undefined,
  files: Request["files"]
) => {
  const variantImageMap = extractUploadedVariantImageMap(files);
  const sharedVariantImages = extractUploadedSharedVariantImageUrls(files);
  const hasVariantImageUploads = Object.keys(variantImageMap).length > 0 || sharedVariantImages.length > 0;
  const hasVariants = Boolean(variants && variants.length > 0);

  if (hasVariantImageUploads && !hasVariants) {
    throw new AppError("Variant images can only be uploaded when variants are provided", 400);
  }
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
 * Parse and validate positive integer query limit within a capped range.
 */
const parseLimitQuery = (
  rawLimit: Request["query"]["limit"],
  options: { min: number; max: number; defaultValue: number }
) => {
  if (rawLimit === undefined) {
    return options.defaultValue;
  }

  const rawValue = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
  const parsed = Number.parseInt(String(rawValue), 10);

  if (Number.isNaN(parsed) || parsed < options.min || parsed > options.max) {
    throw new AppError(`limit must be an integer between ${options.min} and ${options.max}`, 400);
  }

  return parsed;
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
        .select("_id title images variants basePrice category ratings reviewsCount stock sellerId createdAt")
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
 * Get monthly most sold products for public homepage discovery.
 */
export const getMonthlyMostSoldProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseLimitQuery(req.query.limit, {
      min: 1,
      max: 40,
      defaultValue: 8,
    });

    const result = await productService.getMonthlyMostSoldProducts(limit);

    return sendSuccess(res, "Monthly most sold products fetched", {
      products: result.products,
      period: result.period,
      total: result.total,
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
    const parsedPayload = getNormalizedProductPayload(req.body);
    assertVariantUploadConsistency(parsedPayload.variants, req.files);
    const payload = {
      ...parsedPayload,
      variants: applyVariantImages(parsedPayload.variants, req.files),
    };
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
    const parsedPayload = getNormalizedProductPayload(req.body);
    assertVariantUploadConsistency(parsedPayload.variants, req.files);
    const payload = {
      ...parsedPayload,
      variants: applyVariantImages(parsedPayload.variants, req.files),
    };
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

/**
 * Export seller products into downloadable excel/xml/pdf file.
 */
export const exportSellerProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const exportResult = await exportService.exportSellerProducts(String(authUser._id), {
      format: req.query.format,
    });

    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${exportResult.fileName}\"`);
    res.setHeader("Content-Length", String(exportResult.buffer.length));
    res.setHeader("X-Export-Total-Count", String(exportResult.metadata.totalRecords));
    res.setHeader("X-Export-Returned-Count", String(exportResult.metadata.returnedRecords));
    res.setHeader("X-Export-Max-Records", String(exportResult.metadata.maxRecords));
    res.setHeader("X-Export-Truncated", String(exportResult.metadata.truncated));

    return res.status(200).send(exportResult.buffer);
  } catch (error) {
    return next(error);
  }
};
