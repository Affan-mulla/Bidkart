import { NextFunction, Request, Response } from "express";
import Product from "../models/Product.model";

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

    const query: Record<string, unknown> = {
      isApproved: true,
    };

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
