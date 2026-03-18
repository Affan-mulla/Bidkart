import { Link } from "react-router-dom"

const currentYear = new Date().getFullYear()

export default function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© {currentYear} BidKart. All rights reserved.</p>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link className="transition-colors hover:text-foreground" to="/products">
            Products
          </Link>
          {/* <Link className="transition-colors hover:text-foreground" to="/auctions">
            Auctions
          </Link> */}
          <Link className="transition-colors hover:text-foreground" to="/orders">
            Orders
          </Link>
        </nav>
      </div>
    </footer>
  )
}