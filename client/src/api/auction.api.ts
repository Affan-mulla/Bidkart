import axiosInstance from "@/api/axiosInstance"

export interface AuctionBid {
  bidderId: string
  bidderName: string
  amount: number
  isAutoBid: boolean
  timestamp: string
}

export interface Auction {
  _id: string
  sellerId: string
  productId: string
  title: string
  images: string[]
  description: string
  startPrice: number
  buyItNowPrice?: number
  currentBid: number
  currentBidderId?: string
  bidCount: number
  startTime: string
  endTime: string
  originalEndTime: string
  status: "scheduled" | "live" | "ended" | "cancelled" | "sold"
  winnerId?: string
  winnerOrderId?: string
  escrowStatus: "none" | "held" | "released" | "refunded"
  bids: AuctionBid[]
  views: number
  watchers: string[]
}

export interface GetAuctionsParams {
  status?: "scheduled" | "live" | "ended" | "sold"
  sort?: "ending_soon" | "newest" | "most_bids"
  page?: number
  limit?: number
}

export interface PaginatedAuctions {
  auctions: Auction[]
  total: number
  page: number
  totalPages: number
}

export interface CreateAuctionPayload {
  productId: string
  startPrice: number
  reservePrice?: number
  buyItNowPrice?: number
  startTime: string
  endTime: string
}

/**
 * Fetches paginated public auctions with optional status and sorting.
 */
export async function getAuctions(params: GetAuctionsParams): Promise<PaginatedAuctions> {
  const response = await axiosInstance.get("/auctions", { params })
  return response.data?.data
}

/**
 * Fetches full details for a single auction.
 */
export async function getAuctionById(id: string): Promise<Auction> {
  const response = await axiosInstance.get(`/auctions/${id}`)
  return response.data?.data?.auction
}

/**
 * Creates a new seller auction.
 */
export async function createAuction(data: CreateAuctionPayload): Promise<Auction> {
  const response = await axiosInstance.post("/auctions", data)
  return response.data?.data?.auction
}

/**
 * Fetches paginated auctions created by the logged-in seller.
 */
export async function getMyAuctions(page: number): Promise<PaginatedAuctions> {
  const response = await axiosInstance.get("/auctions/seller/mine", {
    params: { page, limit: 10 },
  })

  return response.data?.data
}

/**
 * Places a bid over HTTP as fallback and for explicit API interactions.
 */
export async function placeBidHttp(
  auctionId: string,
  amount: number,
  maxAutoBid?: number,
): Promise<Auction> {
  const response = await axiosInstance.post(`/auctions/${auctionId}/bid`, {
    amount,
    ...(maxAutoBid !== undefined ? { maxAutoBid } : {}),
  })

  return response.data?.data?.auction
}

/**
 * Toggles watch status for the current user on an auction.
 */
export async function toggleWatch(auctionId: string): Promise<void> {
  await axiosInstance.post(`/auctions/${auctionId}/watch`)
}

/**
 * Instantly buys a live auction at buy-it-now price.
 */
export async function buyItNow(auctionId: string): Promise<Auction> {
  const response = await axiosInstance.post(`/auctions/${auctionId}/buy-now`)
  return response.data?.data?.auction
}

/**
 * Cancels a scheduled seller auction.
 */
export async function cancelAuction(auctionId: string): Promise<void> {
  await axiosInstance.delete(`/auctions/${auctionId}`)
}
