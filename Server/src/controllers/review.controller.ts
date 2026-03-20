import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as reviewService from "../services/review.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Normalize route param to string.
 */
const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

/**
 * Create review for delivered order.
 */
export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const review = await reviewService.createReview(String(authUser._id), req.body);

    return sendSuccess(res, "Review created", { review }, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get product review list and rating breakdown.
 */
export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getParamId(req.params.productId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sort =
      (req.query.sort as "newest" | "highest" | "lowest" | "most_helpful" | undefined) ||
      "newest";

    const result = await reviewService.getProductReviews(productId, page, limit, sort);

    return sendSuccess(res, "Reviews fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add one-time seller reply on review.
 */
export const addSellerReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const reviewId = getParamId(req.params.id);
    const result = await reviewService.addSellerReply(reviewId, String(authUser._id), req.body.text);

    return sendSuccess(res, "Reply added", { review: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Toggle helpful vote for authenticated user.
 */
export const toggleHelpful = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const reviewId = getParamId(req.params.id);
    const result = await reviewService.toggleHelpful(reviewId, String(authUser._id));

    return sendSuccess(res, "Helpful vote updated", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete buyer-owned review.
 */
export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;
    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const reviewId = getParamId(req.params.id);
    await reviewService.deleteReview(reviewId, String(authUser._id));

    return sendSuccess(res, "Review deleted", {});
  } catch (error) {
    return next(error);
  }
};
