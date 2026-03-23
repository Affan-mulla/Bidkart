import { logoutUser } from "@/lib/auth.api"
import { useNotificationStore } from "@/store/notificationStore"
import { useAuthStore } from "@/store/useAuthStore"

const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setAuthCredentials = useAuthStore((state) => state.setCredentials)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const pendingEmail = useAuthStore((state) => state.pendingEmail)
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)
  const clearPendingEmail = useAuthStore((state) => state.clearPendingEmail)
  const isLoading = useAuthStore((state) => state.isLoading)

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearPendingEmail()
      sessionStorage.removeItem("bidkart_pending_email")
      clearAuth()
      useNotificationStore.getState().reset()
    }
  }

  return {
    user,
    accessToken,
    role,
    isAuthenticated,
    isLoading,
    pendingEmail,
    setAuthCredentials,
    signOut,
    setPendingEmail,
    clearPendingEmail,
  }
}

export default useAuth
