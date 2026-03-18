import { useEffect } from "react"

import { getMe } from "@/lib/auth.api"
import { useAuthStore } from "@/store/useAuthStore"

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
