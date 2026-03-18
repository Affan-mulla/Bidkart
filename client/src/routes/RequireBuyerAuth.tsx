import useAuth from "@/hooks/useAuth"
import { Navigate, Outlet } from "react-router-dom"

/**
 * Restricts access to authenticated users with buyer role.
 */
export default function RequireBuyerAuth() {
  const { isAuthenticated, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f3f2]">
        <div className="size-10 animate-spin rounded-full border-4 border-[#9b2c2c]/20 border-t-[#9b2c2c]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role !== "buyer") {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}