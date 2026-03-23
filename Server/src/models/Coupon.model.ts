import { Document, Schema, Types, model } from "mongoose";

export type CouponType = "percentage" | "flat";

export interface ICouponUsage {
  userId: Types.ObjectId;
  usedAt: Date;
}

export interface ICoupon {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  userLimit: number;
  usedBy: ICouponUsage[];
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  applicableCategories: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type ICouponDocument = Document<unknown, object, ICoupon> & ICoupon;

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    usedBy: {
      type: [couponUsageSchema],
      default: [],
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validTo: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    applicableCategories: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isActive: 1, validTo: 1 });

const Coupon = model<ICoupon>("Coupon", couponSchema);

export default Coupon;
