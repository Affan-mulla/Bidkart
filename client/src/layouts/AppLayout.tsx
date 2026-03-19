
import BuyerNavbar from "@/components/Shared/BuyerNavbar"
import AppFooter from "@/components/Shared/AppFooter"
import SellerNavbar from "@/components/Shared/SellerNavbar"
import { useAuthStore } from "@/store/authStore"

import { Outlet } from "react-router-dom"

export default function AppLayout() {
  const { role } = useAuthStore() // Get user role from auth store

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {role === "seller" ? <SellerNavbar /> : <BuyerNavbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}