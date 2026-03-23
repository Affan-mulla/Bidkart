import {
  AuctionIcon,
  CreditCardIcon,
  Delete02Icon,
  Notification03Icon,
  Package01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import {
  type Notification,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "@/api/notification.api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/store/useAuthStore"
import { useNotificationStore } from "@/store/notificationStore"
import { getSocket } from "@/lib/socket"

const notificationIconMap: Record<Notification["type"], typeof Notification03Icon> = {
  order_update: Package01Icon,
  bid_placed: AuctionIcon,
  outbid: AuctionIcon,
  auction_won: AuctionIcon,
  auction_ended: AuctionIcon,
  review_reply: Notification03Icon,
  payment_received: CreditCardIcon,
  coupon_applied: CreditCardIcon,
}

function formatRelativeTime(isoDate: string): string {
  const createdAt = new Date(isoDate)
  const now = new Date()
  const diffInMs = now.getTime() - createdAt.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

  if (diffInMinutes < 1) {
    return "Just now"
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hr ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
  }

  return createdAt.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  })
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)

  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount)
  const incrementUnread = useNotificationStore((state) => state.increment)
  const decrementUnread = useNotificationStore((state) => state.decrement)

  const [isOpen, setIsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [isMarkAllLoading, setIsMarkAllLoading] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications(page),
    enabled: isAuthenticated && isOpen,
  })

  const hasMore = page < totalPages

  const notificationCountBadge = useMemo(() => {
    if (unreadCount <= 0) {
      return null
    }

    return unreadCount > 9 ? "9+" : String(unreadCount)
  }, [unreadCount])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }

    const hydrateUnreadCount = async () => {
      try {
        const { count } = await getUnreadCount()
        setUnreadCount(count)
      } catch {
        // Unread count hydration failure should not block nav rendering.
      }
    }

    void hydrateUnreadCount()
  }, [isAuthenticated, setUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const socket = getSocket(accessToken || undefined)

    const handleNewNotification = (payload: { notification: Notification }) => {
      incrementUnread()
      setNotifications((currentItems) => [payload.notification, ...currentItems])

      toast.info(payload.notification.title, {
        description: payload.notification.message,
        action: payload.notification.link
          ? {
              label: "View",
              onClick: () => navigate(payload.notification.link as string),
            }
          : undefined,
      })
    }

    socket.on("notification:new", handleNewNotification)

    return () => {
      socket.off("notification:new", handleNewNotification)
    }
  }, [accessToken, incrementUnread, isAuthenticated, navigate])

  useEffect(() => {
    const response = notificationsQuery.data
    if (!response) {
      return
    }

    setTotalPages(response.totalPages)
    setUnreadCount(response.unreadCount)

    if (page === 1) {
      setNotifications(response.notifications)
      return
    }

    setNotifications((currentItems) => {
      const existingIds = new Set(currentItems.map((item) => item._id))
      const nextItems = response.notifications.filter((item) => !existingIds.has(item._id))
      return [...currentItems, ...nextItems]
    })
  }, [notificationsQuery.data, page, setUnreadCount])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const syncQueryCaches = (updater: (items: Notification[]) => Notification[]) => {
    const cachedQueries = queryClient.getQueriesData<{ notifications: Notification[] }>({
      queryKey: ["notifications"],
    })

    for (const [queryKey, queryData] of cachedQueries) {
      if (!queryData) {
        continue
      }

      queryClient.setQueryData(queryKey, {
        ...queryData,
        notifications: updater(queryData.notifications),
      })
    }
  }

  const handleOpenToggle = () => {
    setIsOpen((previousOpen) => {
      const nextOpen = !previousOpen

      if (nextOpen) {
        setPage(1)
      }

      return nextOpen
    })
  }

  const handleMarkAllRead = async () => {
    try {
      setIsMarkAllLoading(true)
      await markAllRead()

      setNotifications((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          isRead: true,
        })),
      )
      setUnreadCount(0)
      syncQueryCaches((items) => items.map((item) => ({ ...item, isRead: true })))
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
    } catch {
      toast.error("Unable to mark all notifications as read.")
    } finally {
      setIsMarkAllLoading(false)
    }
  }

  const handleItemClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markOneRead(notification._id)
        setNotifications((currentItems) =>
          currentItems.map((item) =>
            item._id === notification._id
              ? {
                  ...item,
                  isRead: true,
                }
              : item,
          ),
        )
        decrementUnread()
        syncQueryCaches((items) =>
          items.map((item) =>
            item._id === notification._id
              ? {
                  ...item,
                  isRead: true,
                }
              : item,
          ),
        )
      }

      if (notification.link) {
        navigate(notification.link)
        setIsOpen(false)
      }
    } catch {
      toast.error("Unable to update notification status.")
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      const targetNotification = notifications.find((item) => item._id === notificationId)
      await deleteNotification(notificationId)

      setNotifications((currentItems) =>
        currentItems.filter((notification) => notification._id !== notificationId),
      )

      if (targetNotification && !targetNotification.isRead) {
        decrementUnread()
      }

      syncQueryCaches((items) => items.filter((item) => item._id !== notificationId))
    } catch {
      toast.error("Unable to delete notification.")
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={handleOpenToggle}
        className="relative"
      >
        <HugeiconsIcon icon={Notification03Icon} className="size-5" />
        {notificationCountBadge ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {notificationCountBadge}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-sm rounded-lg border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void handleMarkAllRead()
              }}
              disabled={isMarkAllLoading || notifications.length === 0}
            >
              {isMarkAllLoading ? "Marking..." : "Mark all read"}
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notificationsQuery.isLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-border p-2">
                    <Skeleton className="mb-2 h-4 w-2/3" />
                    <Skeleton className="mb-1 h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : null}

            {!notificationsQuery.isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center">
                <HugeiconsIcon icon={Notification03Icon} className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
              </div>
            ) : null}

            {!notificationsQuery.isLoading && notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => {
                      void handleItemClick(notification)
                    }}
                    className={`group w-full rounded-md border p-2 text-left transition-colors hover:bg-muted/70 ${
                      notification.isRead
                        ? "border-border bg-background"
                        : "border-border bg-primary/5 border-l-2 border-l-primary"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1 text-muted-foreground">
                        <HugeiconsIcon
                          icon={notificationIconMap[notification.type] || Notification03Icon}
                          className="size-4"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">{notification.title}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDelete(notification._id)
                        }}
                        aria-label="Delete notification"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {notifications.length > 0 && hasMore ? (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={notificationsQuery.isFetching}
              >
                {notificationsQuery.isFetching ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
