import axiosInstance from "@/api/axiosInstance"

export interface RevenueData {
  labels: string[]
  data: number[]
  total: number
  growth: number
}

export interface OrderSummary {
  Placed: number
  Confirmed: number
  Packed: number
  Shipped: number
  Delivered: number
  Cancelled: number
  totalOrders: number
  fulfillmentRate: number
}

export interface TopProduct {
  productId: string
  title: string
  image: string
  totalRevenue: number
  totalUnitsSold: number
  ordersCount: number
}

export interface AuctionPerformance {
  totalAuctions: number
  liveAuctions: number
  completedAuctions: number
  totalBids: number
  avgBidsPerAuction: number
  highestSale: number
  wonRate: number
}

/**
 * Fetches seller revenue trend for a selected period.
 */
export async function getRevenueData(period: "7d" | "30d" | "90d"): Promise<RevenueData> {
  const response = await axiosInstance.get("/analytics/revenue", {
    params: { period },
  })

  return response.data?.data
}

/**
 * Fetches seller order status summary and fulfillment metrics.
 */
export async function getOrderSummary(): Promise<OrderSummary> {
  const response = await axiosInstance.get("/analytics/order-summary")
  return response.data?.data
}

/**
 * Fetches top revenue-driving products for seller.
 */
export async function getTopProducts(): Promise<TopProduct[]> {
  const response = await axiosInstance.get("/analytics/top-products")
  return response.data?.data?.products || []
}

/**
 * Fetches seller auction performance metrics.
 */
export async function getAuctionPerformance(): Promise<AuctionPerformance> {
  const response = await axiosInstance.get("/analytics/auction-perf")
  return response.data?.data
}
