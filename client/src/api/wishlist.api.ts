import axiosInstance from "@/api/axiosInstance"

export interface WishlistItem {
  _id: string
  title: string
  images: string[]
  basePrice: number
  category: string
  ratings: number
  reviewsCount: number
  stock: number
  sellerId: string
}

export interface WishlistResponse {
  items: WishlistItem[]
  total: number
  page: number
  totalPages: number
}

/**
 * Fetches paginated buyer wishlist.
 */
export async function getWishlist(page = 1): Promise<WishlistResponse> {
  const response = await axiosInstance.get("/wishlist", {
    params: { page, limit: 12 },
  })

  return response.data?.data
}

/**
 * Adds product to buyer wishlist.
 */
export async function addToWishlist(productId: string): Promise<void> {
  await axiosInstance.post("/wishlist/add", { productId })
}

/**
 * Removes product from buyer wishlist.
 */
export async function removeFromWishlist(productId: string): Promise<void> {
  await axiosInstance.delete("/wishlist/remove", {
    data: { productId },
  })
}
