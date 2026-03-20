import axiosInstance from "@/api/axiosInstance"

export interface Review {
  _id: string
  productId: string
  sellerId: string
  buyerId: string
  orderId: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  images: string[]
  sellerReply?: { text: string; repliedAt: string }
  helpfulVotes: string[]
  isVerifiedPurchase: boolean
  createdAt: string
  updatedAt: string
  buyer?: { name: string; avatar?: string }
}

export interface RatingBreakdown {
  5: number
  4: number
  3: number
  2: number
  1: number
}

export interface ProductReviewsResponse {
  reviews: Review[]
  total: number
  page: number
  totalPages: number
  ratingBreakdown: RatingBreakdown
}

export interface CreateReviewPayload {
  orderId: string
  rating: number
  title: string
  body: string
  images?: string[]
}

/**
 * Fetches paginated reviews and rating breakdown for a product.
 */
export async function getProductReviews(
  productId: string,
  page = 1,
  sort = "newest",
): Promise<ProductReviewsResponse> {
  const response = await axiosInstance.get(`/reviews/product/${productId}`, {
    params: { page, limit: 5, sort },
  })

  return response.data?.data
}

/**
 * Creates a buyer review from a delivered order.
 */
export async function createReview(data: CreateReviewPayload): Promise<Review> {
  const response = await axiosInstance.post("/reviews", data)
  return response.data?.data?.review
}

/**
 * Adds one-time seller reply to a review.
 */
export async function addSellerReply(reviewId: string, text: string): Promise<Review> {
  const response = await axiosInstance.patch(`/reviews/${reviewId}/reply`, { text })
  return response.data?.data?.review
}

/**
 * Toggles helpful vote for authenticated user.
 */
export async function toggleHelpful(reviewId: string): Promise<{ helpfulCount: number }> {
  const response = await axiosInstance.post(`/reviews/${reviewId}/helpful`)
  return response.data?.data
}

/**
 * Deletes a buyer-owned review.
 */
export async function deleteReview(reviewId: string): Promise<void> {
  await axiosInstance.delete(`/reviews/${reviewId}`)
}
