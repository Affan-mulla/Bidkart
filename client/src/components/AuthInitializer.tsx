import { useEffect } from "react"

import { getUnreadCount } from "@/api/notification.api"
import { getWishlist } from "@/api/wishlist.api"
import { getMe } from "@/lib/auth.api"
import { useNotificationStore } from "@/store/notificationStore"
import { useAuthStore } from "@/store/useAuthStore"
import { useWishlistStore } from "@/store/wishlistStore"

export default function AuthInitializer() {
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const { setLoading, setCredentials } = useAuthStore.getState()
      setLoading(true)

      try {
        const { user } = await getMe()
        const accessToken = useAuthStore.getState().accessToken

        if (!accessToken) {
          throw new Error("Session restore failed: access token missing")
        }

        if (isMounted) {
          setCredentials(user, accessToken)

          if (user.role === "buyer" || user.role === "seller") {
            try {
              const { count } = await getUnreadCount()
              useNotificationStore.getState().setUnreadCount(count)
            } catch {
              // Notification unread hydration failure is non-critical.
            }
          }

          if (user.role === "buyer") {
            try {
              const wishlist = await getWishlist()
              useWishlistStore.getState().setWishlistedIds(
                wishlist.items.map((item) => item._id),
              )
            } catch {
              // Wishlist hydration failure is non-critical.
            }
          }
        }
      } catch {
        if (isMounted) {
          useAuthStore.getState().clearAuth()
        }
      } finally {
        if (isMounted) {
          useAuthStore.getState().setLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  return null
}
