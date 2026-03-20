import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as analyticsService from "../services/analytics.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Get seller revenue analytics.
 */
export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const requestedPeriod = (req.query.period as string | undefined) || "30d";

    if (!["7d", "30d", "90d"].includes(requestedPeriod)) {
      throw new AppError("period must be one of 7d, 30d, 90d", 400);
    }

    const result = await analyticsService.getRevenueData(
      String(authUser._id),
      requestedPeriod as "7d" | "30d" | "90d"
    );

    return sendSuccess(res, "Revenue analytics fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get seller order summary analytics.
 */
export const getOrderSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await analyticsService.getOrderSummary(String(authUser._id));

    return sendSuccess(res, "Order summary fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get seller top products analytics.
 */
export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const parsedLimit = Number(req.query.limit) || 5;
    const result = await analyticsService.getTopProducts(String(authUser._id), parsedLimit);

    return sendSuccess(res, "Top products fetched", { products: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get seller auction performance analytics.
 */
export const getAuctionPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await analyticsService.getAuctionPerformance(String(authUser._id));

    return sendSuccess(res, "Auction performance fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};
