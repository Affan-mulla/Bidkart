import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as cartService from "../services/cart.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Return the authenticated buyer cart.
 */
export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const cart = await cartService.getCart(String(authUser._id));
    return sendSuccess(res, "Cart fetched", { cart });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add a new item to cart.
 */
export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const cart = await cartService.addToCart(String(authUser._id), req.body);
    return sendSuccess(res, "Item added to cart", { cart });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update item quantity for one variant line.
 */
export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { productId, variantKey = "", variantValue = "", quantity } = req.body;
    const cart = await cartService.updateCartItem(
      String(authUser._id),
      productId,
      variantKey,
      variantValue,
      Number(quantity)
    );

    return sendSuccess(res, "Cart updated", { cart });
  } catch (error) {
    return next(error);
  }
};

/**
 * Remove one item line from cart.
 */
export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const { productId, variantKey = "", variantValue = "" } = req.body;
    const cart = await cartService.removeCartItem(
      String(authUser._id),
      productId,
      variantKey,
      variantValue
    );

    return sendSuccess(res, "Item removed", { cart });
  } catch (error) {
    return next(error);
  }
};

/**
 * Clear authenticated buyer cart.
 */
export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    await cartService.clearCart(String(authUser._id));
    return sendSuccess(res, "Cart cleared");
  } catch (error) {
    return next(error);
  }
};
