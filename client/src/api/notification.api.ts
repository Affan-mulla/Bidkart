import axiosInstance from "@/api/axiosInstance"

export interface Notification {
  _id: string
  userId: string
  type:
    | "order_update"
    | "bid_placed"
    | "outbid"
    | "auction_won"
    | "auction_ended"
    | "review_reply"
    | "payment_received"
    | "coupon_applied"
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  page: number
  totalPages: number
  unreadCount: number
}

export async function getNotifications(page = 1): Promise<NotificationsResponse> {
  const response = await axiosInstance.get("/notifications", {
    params: {
      page,
      limit: 15,
    },
  })

  return response.data?.data
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const response = await axiosInstance.get("/notifications/unread-count")
  return response.data?.data
}

export async function markOneRead(id: string): Promise<void> {
  await axiosInstance.patch(`/notifications/${id}/read`)
}

export async function markAllRead(): Promise<void> {
  await axiosInstance.patch("/notifications/read-all")
}

export async function deleteNotification(id: string): Promise<void> {
  await axiosInstance.delete(`/notifications/${id}`)
}
