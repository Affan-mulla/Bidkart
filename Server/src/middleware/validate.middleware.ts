import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import AppError from "../utils/appError";

const emailSchema = z.string().email("Please provide a valid email address").toLowerCase();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password cannot exceed 64 characters");

export const authSchemas = {
  registerBuyer: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(80),
    email: emailSchema,
    password: passwordSchema,
  }),
  verifyEmail: z.object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  }),
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
  registerSeller: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(80),
    email: emailSchema,
    password: passwordSchema,
    storeName: z.string().min(2, "Store name is required").max(120),
    storeDescription: z.string().min(5, "Store description is required").max(500),
  }),
  forgotPassword: z.object({
    email: emailSchema,
  }),
  resetPassword: z.object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
    newPassword: passwordSchema,
  }),
  resendOtp: z.object({
    email: emailSchema,
    type: z.enum(["verify", "reset"]),
  }),
};

export const auctionSchemas = {
  createAuction: z.object({
    productId: z.string(),
    startPrice: z.number().min(1),
    reservePrice: z.number().optional(),
    buyItNowPrice: z.number().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  }),
  placeBid: z.object({
    amount: z.number().min(1),
    maxAutoBid: z.number().optional(),
  }),
};

export const reviewSchemas = {
  createReview: z.object({
    orderId: z.string().min(1, "Order ID required"),
    rating: z.number().int().min(1).max(5),
    title: z.string().min(3, "Title too short").max(100),
    body: z.string().min(10, "Review too short").max(1000),
    images: z.array(z.string().url()).max(3).optional(),
  }),
  sellerReply: z.object({
    text: z.string().min(1).max(500),
  }),
};

export const profileSchemas = {
  updateProfile: z.object({
    name: z.string().min(2).max(80).optional(),
  }),
  address: z.object({
    label: z.enum(["Home", "Work", "Other"]),
    fullName: z.string().min(2).max(80),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),
    addressLine1: z.string().min(5).max(200),
    addressLine2: z.string().max(200).optional(),
    city: z.string().min(1).max(80),
    state: z.string().min(1).max(80),
    pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
    isDefault: z.boolean().optional(),
  }),
};

export const couponSchemas = {
  validateCoupon: z.object({
    code: z.string().min(1, "Coupon code is required").max(40),
  }),
  applyCoupon: z.object({
    couponId: z.string().min(1, "couponId is required"),
  }),
};

/**
 * Validate request body against Zod schema.
 */
export const validateBody = (schema: z.ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError("Validation failed", 400, fieldErrors));
    }

    req.body = result.data;
    return next();
  };
};
