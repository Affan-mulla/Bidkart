import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const currentYear = new Date().getFullYear()

export default function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© {currentYear} BidKart. All rights reserved.</p>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link className="inline-flex items-center gap-1 transition-colors hover:text-foreground" to="/products">
            Products
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
          </Link>
          {/* <Link className="transition-colors hover:text-foreground" to="/auctions">
            Auctions
          </Link> */}
          <Link className="inline-flex items-center gap-1 transition-colors hover:text-foreground" to="/orders">
            Orders
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
          </Link>
        </nav>
      </div>
    </footer>
  )
}