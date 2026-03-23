import { Types } from "mongoose";
import Order from "../models/Order.model";
import Product from "../models/Product.model";
import Review, { IReviewDocument } from "../models/Review.model";
import User from "../models/User.model";
import AppError from "../utils/appError";
import { createNotification } from "./notification.service";

interface CreateReviewInput {
  orderId: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
}

type ReviewSort = "newest" | "highest" | "lowest" | "most_helpful";

/**
 * Validate MongoDB object id.
 */
const ensureObjectId = (value: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
};

/**
 * Recalculate product average rating and review count.
 */
export const recalculateProductRating = async (productId: string) => {
  ensureObjectId(productId, "Invalid product id");

  const result = await Review.aggregate([
    { $match: { productId: new Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgRating = result[0] ? Math.round(result[0].avgRating * 10) / 10 : 0;
  const count = result[0]?.count ?? 0;

  await Product.findByIdAndUpdate(productId, {
    ratings: avgRating,
    reviewsCount: count,
  });
};

/**
 * Create a verified purchase review for delivered order.
 */
export const createReview = async (
  buyerId: string,
  data: CreateReviewInput
): Promise<IReviewDocument> => {
  ensureObjectId(buyerId, "Invalid buyer id");
  ensureObjectId(data.orderId, "Invalid order id");

  const order = await Order.findOne({
    _id: new Types.ObjectId(data.orderId),
    buyerId: new Types.ObjectId(buyerId),
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status !== "Delivered") {
    throw new AppError("Only delivered orders can be reviewed", 400);
  }

  const existingReview = await Review.findOne({
    orderId: new Types.ObjectId(data.orderId),
  }).select("_id");

  if (existingReview) {
    throw new AppError("Already reviewed", 409);
  }

  const orderItem = order.items[0];
  if (!orderItem) {
    throw new AppError("Order has no reviewable item", 400);
  }

  const review = await Review.create({
    orderId: new Types.ObjectId(data.orderId),
    buyerId: new Types.ObjectId(buyerId),
    productId: orderItem.productId,
    sellerId: orderItem.sellerId,
    rating: data.rating,
    title: data.title,
    body: data.body,
    images: data.images || [],
    helpfulVotes: [],
    isVerifiedPurchase: true,
  });

  await recalculateProductRating(String(orderItem.productId));

  return review;
};

/**
 * Fetch paginated product reviews with rating breakdown.
 */
export const getProductReviews = async (
  productId: string,
  page: number,
  limit: number,
  sort: ReviewSort = "newest"
) => {
  ensureObjectId(productId, "Invalid product id");

  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const sortMap: Record<ReviewSort, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
    most_helpful: { helpfulCount: -1, createdAt: -1 },
  };

  const reviewsPipeline = [
    { $match: { productId: new Types.ObjectId(productId) } },
    {
      $addFields: {
        helpfulCount: { $size: "$helpfulVotes" },
      },
    },
    { $sort: sortMap[sort] || sortMap.newest },
    { $skip: skip },
    { $limit: parsedLimit },
    {
      $lookup: {
        from: "users",
        localField: "buyerId",
        foreignField: "_id",
        as: "buyer",
        pipeline: [{ $project: { _id: 1, name: 1, avatar: 1 } }],
      },
    },
    {
      $addFields: {
        buyer: { $arrayElemAt: ["$buyer", 0] },
      },
    },
    {
      $project: {
        helpfulCount: 0,
      },
    },
  ];

  const [reviews, total, breakdownRows] = await Promise.all([
    Review.aggregate(reviewsPipeline),
    Review.countDocuments({ productId: new Types.ObjectId(productId) }),
    Review.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  breakdownRows.forEach((row) => {
    const rating = Number(row._id) as 1 | 2 | 3 | 4 | 5;
    if (ratingBreakdown[rating] !== undefined) {
      ratingBreakdown[rating] = row.count;
    }
  });

  return {
    reviews,
    total,
    page: parsedPage,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    ratingBreakdown,
  };
};

/**
 * Add one-time seller reply to review.
 */
export const addSellerReply = async (reviewId: string, sellerId: string, text: string) => {
  ensureObjectId(reviewId, "Invalid review id");
  ensureObjectId(sellerId, "Invalid seller id");

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (String(review.sellerId) !== sellerId) {
    throw new AppError("Forbidden", 403);
  }

  if (review.sellerReply) {
    throw new AppError("Already replied", 400);
  }

  review.sellerReply = {
    text,
    repliedAt: new Date(),
  };

  await review.save();

  const seller = await User.findById(sellerId).select("name");
  const sellerName = seller?.name || "Seller";

  await createNotification(String(review.buyerId), {
    type: "review_reply",
    title: "Seller replied to your review",
    message: `${sellerName} replied to your review.`,
    link: "/orders",
  });

  return review;
};

/**
 * Toggle helpful vote for a review.
 */
export const toggleHelpful = async (reviewId: string, userId: string) => {
  ensureObjectId(reviewId, "Invalid review id");
  ensureObjectId(userId, "Invalid user id");

  const existingVote = await Review.findOne({
    _id: new Types.ObjectId(reviewId),
    helpfulVotes: new Types.ObjectId(userId),
  }).select("_id");

  const review = await Review.findByIdAndUpdate(
    reviewId,
    existingVote
      ? { $pull: { helpfulVotes: new Types.ObjectId(userId) } }
      : { $addToSet: { helpfulVotes: new Types.ObjectId(userId) } },
    { new: true }
  ).select("helpfulVotes");

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return {
    helpfulCount: review.helpfulVotes.length,
  };
};

/**
 * Delete buyer-owned review and refresh product ratings.
 */
export const deleteReview = async (reviewId: string, buyerId: string) => {
  ensureObjectId(reviewId, "Invalid review id");
  ensureObjectId(buyerId, "Invalid buyer id");

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (String(review.buyerId) !== buyerId) {
    throw new AppError("Forbidden", 403);
  }

  const productId = String(review.productId);

  await Review.deleteOne({ _id: review._id });
  await recalculateProductRating(productId);
};
