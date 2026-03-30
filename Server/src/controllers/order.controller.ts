import { NextFunction, Request, Response } from "express";
import Order from "../models/Order.model";
import { IUserDocument } from "../models/User.model";
import * as exportService from "../services/export.service";
import * as invoiceService from "../services/invoice.service";
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

    const { shippingAddress, paymentMethod = "COD", couponCode } = req.body;
    const order = await orderService.placeOrder(
      String(authUser._id),
      shippingAddress,
      paymentMethod,
      couponCode
    );

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

/**
 * Confirm simulated Razorpay payment for a buyer order.
 */
export const confirmFakePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const orderId = getParamId(req.params.id);
    const order = await orderService.confirmFakeRazorpayPayment(orderId, String(authUser._id));

    return sendSuccess(res, "Payment confirmed successfully", { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * Download order invoice PDF.
 */
export const downloadInvoiceHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const order = await Order.findOne({
      _id: req.params.id,
      buyerId: authUser._id,
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.paymentStatus !== "Paid") {
      throw new AppError("Invoice not available yet", 403);
    }

    invoiceService.streamInvoicePDF(order, authUser.email, res);
  } catch (error) {
    return next(error);
  }
};

/**
 * Export seller orders into downloadable excel/xml/pdf file.
 */
export const exportSellerOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const exportResult = await exportService.exportSellerOrders(String(authUser._id), {
      format: req.query.format,
      status: req.query.status,
      duration: req.query.duration,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
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
