import { Navigate, Outlet } from "react-router-dom"

import useAuth from "@/hooks/useAuth"

const RoleRoute = ({ role }: { role: string }) => {
  const { role: currentRole } = useAuth()

  if (currentRole !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default RoleRoute
