import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as orderService from "../services/order.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Normalize route param to a plain string.
 */
const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

/**
 * Place order from current buyer cart.
 */
export const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { shippingAddress, paymentMethod = "COD" } = req.body;
    const order = await orderService.placeOrder(String(authUser._id), shippingAddress, paymentMethod);

    return sendSuccess(res, "Order placed successfully", { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch paginated buyer orders.
 */
export const getBuyerOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await orderService.getBuyerOrders(String(authUser._id), page, limit);

    return sendSuccess(res, "Orders fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch one buyer order.
 */
export const getBuyerOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const orderId = getParamId(req.params.id);
    const order = await orderService.getBuyerOrderById(orderId, String(authUser._id));

    return sendSuccess(res, "Order fetched", { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch paginated seller orders.
 */
export const getSellerOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as string | undefined;
    const result = await orderService.getSellerOrders(String(authUser._id), page, limit, status);

    return sendSuccess(res, "Orders fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch one seller order.
 */
export const getSellerOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const orderId = getParamId(req.params.id);
    const order = await orderService.getSellerOrderById(orderId, String(authUser._id));

    return sendSuccess(res, "Order fetched", { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update seller order status.
 */
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { status } = req.body;
    const orderId = getParamId(req.params.id);
    const order = await orderService.updateOrderStatus(orderId, String(authUser._id), status);

    return sendSuccess(res, "Order status updated", { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * Cancel buyer order.
 */
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { reason = "" } = req.body;
    const orderId = getParamId(req.params.id);
    const order = await orderService.cancelOrder(orderId, String(authUser._id), reason);

    return sendSuccess(res, "Order cancelled", { order });
  } catch (error) {
    return next(error);
  }
};
