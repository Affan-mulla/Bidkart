import { Document, Schema, Types, model } from "mongoose";

export interface ISellerReply {
  text: string;
  repliedAt: Date;
}

export interface IReview {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  buyerId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  images: string[];
  sellerReply?: ISellerReply;
  helpfulVotes: Types.ObjectId[];
  isVerifiedPurchase: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IReviewDocument = Document<unknown, object, IReview> & IReview;

const sellerReplySchema = new Schema<ISellerReply>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    repliedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const reviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 3,
        message: "At most 3 images are allowed",
      },
    },
    sellerReply: {
      type: sellerReplySchema,
      default: undefined,
    },
    helpfulVotes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ productId: 1 });
reviewSchema.index({ buyerId: 1 });
reviewSchema.index({ orderId: 1 }, { unique: true });

const Review = model<IReview>("Review", reviewSchema);

export default Review;
