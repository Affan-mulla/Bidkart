import { Types } from "mongoose";
import Coupon, { CouponType, ICouponDocument } from "../models/Coupon.model";
import AppError from "../utils/appError";

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  userLimit?: number;
  validFrom: Date;
  validTo: Date;
  isActive?: boolean;
  applicableCategories?: string[];
}

interface ValidateCouponResult {
  coupon: ICouponDocument;
  discountAmount: number;
  finalAmount: number;
}

/**
 * Validate coupon eligibility and compute discount against cart subtotal.
 */
export const validateCoupon = async (
  code: string,
  userId: string,
  cartSubtotal: number,
  cartCategories: string[]
): Promise<ValidateCouponResult> => {
  if (!code || !code.trim()) {
    throw new AppError("Coupon code is required", 400);
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Unauthorized", 401);
  }

  const normalizedCode = code.trim().toUpperCase();
  const now = new Date();

  const coupon = await Coupon.findOne({
    code: normalizedCode,
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  });

  if (!coupon) {
    throw new AppError("Invalid or expired coupon", 400);
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("Coupon usage limit reached", 400);
  }

  const userUsageCount = coupon.usedBy.filter((entry) => String(entry.userId) === userId).length;

  if (userUsageCount >= coupon.userLimit) {
    throw new AppError("You have already used this coupon", 400);
  }

  if (cartSubtotal < coupon.minOrderValue) {
    throw new AppError(`Minimum order value is ₹${coupon.minOrderValue}`, 400);
  }

  const applicableCategories = coupon.applicableCategories || [];
  if (applicableCategories.length > 0) {
    const normalizedCartCategories = new Set(
      cartCategories.map((category) => category.toLowerCase())
    );
    const hasApplicableCategory = applicableCategories.some((category) =>
      normalizedCartCategories.has(category.toLowerCase())
    );

    if (!hasApplicableCategory) {
      throw new AppError("Coupon not applicable for items in your cart", 400);
    }
  }

  const rawDiscount =
    coupon.type === "flat"
      ? Math.min(coupon.value, cartSubtotal)
      : Math.min(
          (cartSubtotal * coupon.value) / 100,
          coupon.maxDiscount ?? Number.POSITIVE_INFINITY
        );

  const discountAmount = Math.max(0, Math.round(rawDiscount * 100) / 100);
  const finalAmount = Math.max(0, Math.round((cartSubtotal - discountAmount) * 100) / 100);

  return {
    coupon,
    discountAmount,
    finalAmount,
  };
};

/**
 * Mark a coupon as used by a buyer after successful order placement.
 */
export const applyCoupon = async (couponId: string, userId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(couponId) || !Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid coupon", 400);
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
    $inc: { usedCount: 1 },
    $push: {
      usedBy: {
        userId: new Types.ObjectId(userId),
        usedAt: new Date(),
      },
    },
  }).select("_id");

  if (!updatedCoupon) {
    throw new AppError("Coupon not found", 404);
  }
};

/**
 * Create a coupon for admin/seed workflows.
 */
export const createCoupon = async (data: CouponInput): Promise<ICouponDocument> => {
  if (!data.code || !data.code.trim()) {
    throw new AppError("Coupon code is required", 400);
  }

  const coupon = await Coupon.create({
    code: data.code.trim().toUpperCase(),
    type: data.type,
    value: data.value,
    minOrderValue: data.minOrderValue,
    maxDiscount: data.maxDiscount,
    usageLimit: data.usageLimit,
    usedCount: 0,
    userLimit: data.userLimit ?? 1,
    usedBy: [],
    validFrom: data.validFrom,
    validTo: data.validTo,
    isActive: data.isActive ?? true,
    applicableCategories: data.applicableCategories ?? [],
  });

  return coupon;
};
