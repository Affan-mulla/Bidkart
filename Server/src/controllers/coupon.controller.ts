import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import Cart from "../models/Cart.model";
import Product from "../models/Product.model";
import { IUserDocument } from "../models/User.model";
import * as couponService from "../services/coupon.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Validate coupon against current buyer cart.
 */
export const validateCouponHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { code } = req.body as { code: string };

    const cart = await Cart.findOne({ userId: authUser._id });

    if (!cart || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const productIds = Array.from(new Set(cart.items.map((item) => String(item.productId))));

    const products = await Product.find({
      _id: { $in: productIds.map((id) => new Types.ObjectId(id)) },
    }).select("category");

    const cartCategories = Array.from(
      new Set(products.map((product) => (product.category || "").trim()).filter(Boolean))
    );

    const result = await couponService.validateCoupon(
      code,
      String(authUser._id),
      subtotal,
      cartCategories
    );

    return sendSuccess(res, "Coupon validated", {
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      couponCode: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Apply coupon usage after successful order payment/placement.
 */
export const applyCouponHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { couponId } = req.body as { couponId: string };

    await couponService.applyCoupon(couponId, String(authUser._id));

    return sendSuccess(res, "Coupon applied successfully", {});
  } catch (error) {
    return next(error);
  }
};
