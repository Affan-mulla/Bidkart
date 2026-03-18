import { Outlet } from "react-router-dom"

/**
 * Allows guests and authenticated users to access cart routes.
 */
export default function GuestCartRoute() {
  return <Outlet />
}