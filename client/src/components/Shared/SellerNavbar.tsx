import { useAuthStore } from "@/store/authStore"
import useAuth from "@/hooks/useAuth"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu01Icon } from "@hugeicons/core-free-icons"

import Logo from "./Logo"
import NotificationBell from "@/components/notifications/NotificationBell"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"


export default function SellerNavbar() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      <>
      <nav className="top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
            aria-label="Open seller navigation"
          >
            <HugeiconsIcon icon={Menu01Icon} className="size-5" />
          </Button>
          <Logo />
        </div>

        <ul className="hidden items-center gap-1 text-sm lg:flex">
          <SellerNavItem to="/seller/dashboard">Dashboard</SellerNavItem>
          <SellerNavItem to="/seller/listings">Listings</SellerNavItem>
          <SellerNavItem to="/seller/orders">Orders</SellerNavItem>
          <SellerNavItem to="/seller/auctions/create">Auctions</SellerNavItem>
          <SellerNavItem to="/seller/analytics">Analytics</SellerNavItem>
        </ul>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Badge variant="secondary" className="hidden rounded-full px-3 py-1 text-xs sm:inline-flex">
            Seller
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="hidden sm:inline-flex cursor-pointer">
                <AvatarFallback className="bg-primary/10 text-primary w-full h-full flex items-center justify-center text-sm font-semibold">
                  {initials || "S"}
                </AvatarFallback>
                <AvatarImage src={user?.avatar} alt={user?.name || "Seller Avatar"} />
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="border-b border-border/60 pb-2">
                <p className="truncate text-sm font-medium">{user?.name || "Seller"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || "seller@example.com"}</p>
              </DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link to="/seller/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/seller/orders">Orders</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void handleLogout()
                }}
                disabled={isLoggingOut}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-border bg-background p-4 lg:hidden">
          <ul className="flex flex-col gap-2">
            <MobileSellerNavItem to="/seller/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              Dashboard
            </MobileSellerNavItem>
            <MobileSellerNavItem to="/seller/listings" onClick={() => setIsMobileMenuOpen(false)}>
              Listings
            </MobileSellerNavItem>
            <MobileSellerNavItem to="/seller/orders" onClick={() => setIsMobileMenuOpen(false)}>
              Orders
            </MobileSellerNavItem>
            <MobileSellerNavItem to="/seller/auctions/create" onClick={() => setIsMobileMenuOpen(false)}>
              Auctions
            </MobileSellerNavItem>
            <MobileSellerNavItem to="/seller/analytics" onClick={() => setIsMobileMenuOpen(false)}>
              Analytics
            </MobileSellerNavItem>
          </ul>
        </div>
      ) : null}
    </>
  )
}

function SellerNavItem({ to , children } : { to: string, children: React.ReactNode }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  )
}

function MobileSellerNavItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <NavLink
        to={to}
        end
        onClick={onClick}
        className={({ isActive }) =>
          `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  )
}