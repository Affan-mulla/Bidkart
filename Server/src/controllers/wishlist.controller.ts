import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as wishlistService from "../services/wishlist.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Get paginated wishlist items for buyer.
 */
export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await wishlistService.getWishlist(String(authUser._id), page, limit);

    return sendSuccess(res, "Wishlist fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add product to buyer wishlist.
 */
export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { productId } = req.body as { productId?: string };
    if (!productId) {
      throw new AppError("productId is required", 400);
    }

    const result = await wishlistService.addToWishlist(String(authUser._id), productId);

    return sendSuccess(res, "Wishlist updated", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Remove product from buyer wishlist.
 */
export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { productId } = req.body as { productId?: string };
    if (!productId) {
      throw new AppError("productId is required", 400);
    }

    const result = await wishlistService.removeFromWishlist(String(authUser._id), productId);

    return sendSuccess(res, "Wishlist updated", { ...result });
  } catch (error) {
    return next(error);
  }
};
