import { NextFunction, Request, Response } from "express";
import Product from "../models/Product.model";
import { IUserDocument } from "../models/User.model";
import * as auctionService from "../services/auction.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Convert route param value to string.
 */
const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

/**
 * Create a seller auction from product snapshot.
 */
export const createAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (String(product.sellerId) !== String(authUser._id)) {
      throw new AppError("Forbidden", 403);
    }

    const auction = await auctionService.createAuction(String(authUser._id), req.body, {
      title: product.title,
      images: product.images,
      description: product.description,
    });

    return sendSuccess(res, "Auction created successfully", { auction }, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch public auctions with filters.
 */
export const getAuctions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await auctionService.getAuctions({
      status: req.query.status as
        | "scheduled"
        | "live"
        | "ended"
        | "cancelled"
        | "sold"
        | undefined,
      category: req.query.category as string | undefined,
      sellerId: req.query.sellerId as string | undefined,
      sort: req.query.sort as "ending_soon" | "newest" | "most_bids" | undefined,
      page,
      limit,
    });

    return sendSuccess(res, "Auctions fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch one public auction detail.
 */
export const getAuctionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auctionId = getParamId(req.params.id);
    const auction = await auctionService.getAuctionById(auctionId);

    return sendSuccess(res, "Auction fetched", { auction });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a seller auction while scheduled.
 */
export const updateAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const auctionId = getParamId(req.params.id);
    const auction = await auctionService.updateAuction(auctionId, String(authUser._id), req.body);

    return sendSuccess(res, "Auction updated", { auction });
  } catch (error) {
    return next(error);
  }
};

/**
 * Cancel a seller auction while scheduled.
 */
export const cancelAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const auctionId = getParamId(req.params.id);
    const auction = await auctionService.cancelAuction(auctionId, String(authUser._id));

    return sendSuccess(res, "Auction cancelled", { auction });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch seller-owned auction list.
 */
export const getMyAuctions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await auctionService.getMyAuctions(String(authUser._id), page, limit);

    return sendSuccess(res, "My auctions fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Place bid over HTTP as fallback to socket-based flow.
 */
export const placeBidHttp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const auctionId = getParamId(req.params.id);
    const { amount, maxAutoBid } = req.body;

    const auction = await auctionService.placeBid(
      auctionId,
      String(authUser._id),
      authUser.name,
      Number(amount),
      maxAutoBid !== undefined ? Number(maxAutoBid) : undefined
    );

    return sendSuccess(res, "Bid placed successfully", { auction });
  } catch (error) {
    return next(error);
  }
};

/**
 * Toggle buyer watch state for an auction.
 */
export const toggleWatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const auctionId = getParamId(req.params.id);
    const result = await auctionService.toggleWatch(auctionId, String(authUser._id));

    return sendSuccess(res, "Watch status updated", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Complete buy-it-now for a live auction.
 */
export const buyItNow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const auctionId = getParamId(req.params.id);
    const auction = await auctionService.buyItNow(auctionId, String(authUser._id));

    return sendSuccess(res, "Buy it now successful", { auction });
  } catch (error) {
    return next(error);
  }
};
