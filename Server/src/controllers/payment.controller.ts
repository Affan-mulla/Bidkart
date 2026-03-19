import { NextFunction, Request, Response } from "express";
import Order from "../models/Order.model";
import { IUserDocument } from "../models/User.model";
import * as invoiceService from "../services/invoice.service";
import * as paymentService from "../services/payment.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Create Razorpay order for a buyer order.
 */
export const createRazorpayOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { orderId } = req.body as { orderId?: string };

    if (!orderId) {
      throw new AppError("orderId is required", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (String(order.buyerId) !== String(authUser._id)) {
      throw new AppError("Forbidden", 403);
    }

    if (order.paymentStatus === "Paid") {
      throw new AppError("Order already paid", 400);
    }

    const razorpayOrder = await paymentService.createRazorpayOrder(orderId, order.totalAmount);

    return sendSuccess(res, "Razorpay order created", razorpayOrder);
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify Razorpay payment and mark order paid.
 */
export const verifyPaymentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
      orderId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError("All payment fields are required", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (String(order.buyerId) !== String(authUser._id)) {
      throw new AppError("Forbidden", 403);
    }

    await paymentService.markOrderPaid(
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    return sendSuccess(res, "Payment verified successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle Razorpay webhook callbacks.
 */
export const webhookHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

    if (!signature) {
      throw new AppError("Missing webhook signature", 400);
    }

    await paymentService.handleWebhookEvent(req.body as Buffer, signature);

    return res.status(200).json({ received: true });
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

    const isRazorpayInvoiceAvailable =
      order.paymentMethod === "Razorpay" && order.paymentStatus === "Paid";
    const isCodInvoiceAvailable = order.paymentMethod === "COD" && order.status === "Delivered";

    if (!isRazorpayInvoiceAvailable && !isCodInvoiceAvailable) {
      throw new AppError("Invoice not available yet", 403);
    }

    invoiceService.streamInvoicePDF(order, authUser.email, res);
  } catch (error) {
    return next(error);
  }
};
