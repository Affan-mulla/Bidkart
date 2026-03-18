import { useAuthStore } from "@/store/authStore";
import useAuth from "@/hooks/useAuth";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import Logo from "./Logo";
import { useState } from "react";
import { Menu01Icon, Search01Icon, ShoppingCart01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

export default function BuyerNavbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSearchRedirect = () => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      return;
    }

    navigate(`/s?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await signOut();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Could not reach server. You have been logged out locally.");
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <nav
        className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b border-border 
                      flex items-center justify-between px-4 lg:px-8 h-16 gap-4"
      >
        <div className="flex gap-4 items-center">
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-foreground hover:bg-muted p-1.5 rounded-md"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <HugeiconsIcon icon={Menu01Icon} />
          </button>
          
          {/* Logo */}
          <Logo />

          <div className="hidden lg:flex flex-col px-3 ml-3 border-l border-border/60">
            {/* Location */}
            <span className="text-xs text-muted-foreground leading-tight">
              Deliver to
            </span>
            <span className="text-sm font-medium leading-tight cursor-pointer hover:text-primary transition-colors">
              New York
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-2xl items-center gap-2 bg-muted/50 border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 hover:bg-muted/80 transition-all rounded-full px-4 h-10">
          <button
            type="button"
            className="text-muted-foreground"
            onClick={handleSearchRedirect}
            aria-label="Search"
          >
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
          </button>
          <input
            type="text"
            placeholder="Search products, auctions and more..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearchRedirect();
              }
            }}
            className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Nav links */}
        <ul className="hidden lg:flex items-center gap-1.5 text-sm">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/products">Products</NavItem>
          <NavItem to="/auctions">Auctions</NavItem>
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Search Icon */}
          <button
            type="button"
            className="md:hidden text-foreground hover:bg-muted p-2 rounded-full transition-colors"
            onClick={handleSearchRedirect}
            aria-label="Search"
          >
             <HugeiconsIcon icon={Search01Icon} className="size-5" />
          </button>

          {/* Cart icon — always visible */}
          <Link
            to="/cart"
            className="relative flex items-center justify-center p-2 rounded-full hover:bg-muted text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ShoppingCart01Icon} className="size-5" />
            {1 > 0 && (
              <span
                className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] 
                               font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center 
                               justify-center border-2 border-background shadow-sm"
              >
                {1 > 9 ? "9+" : 1}
              </span>
            )}
          </Link>

          <div className="hidden sm:block w-px h-6 bg-border mx-1" />

          {token ? (
            /* Logged in — show avatar + dropdown */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden sm:flex w-10 h-10 rounded-full bg-primary/10 text-primary 
                                 text-sm font-semibold items-center justify-center 
                                 ring-2 ring-transparent data-[state=open]:ring-primary/20 transition-all cursor-pointer"
                >
                  {initials || "U"}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuLabel className="border-b border-border/50 mb-1">
                  <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
                </DropdownMenuLabel>

                <DropdownMenuItem asChild>
                  <Link to="/profile">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders">My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="lg:hidden">
                  <Link to="/wishlist">Wishlist</Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="text-destructive font-medium focus:bg-destructive/10 focus:text-destructive"
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Guest — show login + signup */
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="lg" className="">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="form" className="">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border mt-16 p-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              <MobileNavItem to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</MobileNavItem>
              <MobileNavItem to="/products" onClick={() => setIsMobileMenuOpen(false)}>Products</MobileNavItem>
              <MobileNavItem to="/auctions" onClick={() => setIsMobileMenuOpen(false)}>Auctions</MobileNavItem>
              {token && (
                <>
                  <div className="h-px bg-border/50 my-2" />
                  <MobileNavItem to="/orders" onClick={() => setIsMobileMenuOpen(false)}>Orders</MobileNavItem>
                  <MobileNavItem to="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>Wishlist</MobileNavItem>
                  <MobileNavItem to="/profile" onClick={() => setIsMobileMenuOpen(false)}>Profile</MobileNavItem>
                </>
              )}
            </ul>

            {!token ? (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/50">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center h-12">Log in</Button>
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full justify-center h-12">Sign up</Button>
                </Link>
              </div>
            ) : (
              <Button 
                variant="destructive" 
                disabled={isLoggingOut}
                className="w-full justify-center h-12 mt-4"
                onClick={() => {
                  void handleLogout();
                  setIsMobileMenuOpen(false);
                }}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `px-3 py-1.5 rounded text-sm font-medium transition-all ${
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  );
}

function MobileNavItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <li>
      <NavLink
        to={to}
        end
        onClick={onClick}
        className={({ isActive }) =>
          `block px-4 py-3 rounded-xl text-base font-medium transition-all ${
            isActive
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  );
}
