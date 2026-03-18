import { useAuthStore } from "@/store/authStore"
import useAuth from "@/hooks/useAuth"
import { NavLink, useNavigate } from "react-router-dom"
import { useState } from "react"
import { toast } from "sonner"


export default function SellerNavbar() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navigate = useNavigate()

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    try {
      setIsLoggingOut(true)
      await signOut()
      toast.success("Logged out successfully")
      navigate("/login", { replace: true })
    } catch {
      toast.error("Could not reach server. You have been logged out locally.")
      navigate("/login", { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <nav className="sticky top-0 z-50 h-14 bg-white border-b border-gray-100 
                    flex items-center justify-between px-6 gap-4">

      {/* Logo — orange dot for seller */}
      <div className="flex items-center gap-2 font-medium text-lg shrink-0">
        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
        BidKart
      </div>

      {/* Seller nav links */}
      <ul className="flex items-center gap-1 text-sm">
        <SellerNavItem to="/seller/dashboard">Dashboard</SellerNavItem>
        <SellerNavItem to="/seller/listings">Listings</SellerNavItem>
        <SellerNavItem to="/seller/orders">Orders</SellerNavItem>
        <SellerNavItem to="/seller/auctions/create">Auctions</SellerNavItem>
        <SellerNavItem to="/seller/analytics">Analytics</SellerNavItem>
      </ul>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center 
                           rounded-lg border border-gray-200 hover:bg-gray-50 
                           text-gray-500 hover:text-gray-800 transition-colors">
          <BellIcon />
        </button>

        <div className="w-px h-5 bg-gray-200" />

        {/* Seller badge */}
        <span className="text-xs bg-orange-50 text-orange-800 px-2.5 py-1 
                         rounded-full font-medium">
          Seller
        </span>

        {/* Avatar dropdown */}
        <div className="relative group">
          <button className="w-8 h-8 rounded-full bg-orange-50 text-orange-800 
                             text-xs font-medium flex items-center justify-center 
                             border border-gray-200 cursor-pointer">
            {initials}
          </button>
          <div className="absolute right-0 top-10 w-44 bg-white border border-gray-100 
                          rounded-xl shadow-sm py-1 hidden group-hover:block z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <NavLink to="/seller/dashboard"
              className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Dashboard
            </NavLink>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={() => {
                void handleLogout()
              }}
              disabled={isLoggingOut}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function SellerNavItem({ to , children } : { to: string, children: React.ReactNode }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isActive
              ? "bg-orange-50 text-orange-800 font-medium"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}