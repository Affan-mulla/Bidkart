import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Clock01Icon } from "@hugeicons/core-free-icons"

import { type Auction } from "@/api/auction.api"
import CountdownTimer from "@/components/auction/CountdownTimer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

/**
 * Compact auction card for listing grids.
 */
export default function AuctionCard({ auction }: { auction: Auction }) {
  const image = auction.images?.[0] || "https://placehold.co/800x500?text=Auction"

  const statusBadge =
    auction.status === "live" ? (
      <Badge className="gap-1 bg-amber-500 text-white">
        <span className="size-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </Badge>
    ) : auction.status === "scheduled" ? (
      <Badge variant="secondary">UPCOMING</Badge>
    ) : (
      <Badge variant="outline">{auction.status.toUpperCase()}</Badge>
    )

  return (
    <Link to={`/auctions/${auction._id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/80 py-0 transition-all group-hover:shadow-md">
        <div className="relative">
          <img src={image} alt={auction.title} className="h-48 w-full object-cover" loading="lazy" />
          <div className="absolute left-3 top-3">{statusBadge}</div>
        </div>

        <CardContent className="space-y-3 p-4">
          <p className="line-clamp-2 min-h-10 text-sm font-semibold text-foreground">{auction.title}</p>

          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(auction.currentBid)}</p>
          </div>

          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2.5">
            {auction.status === "scheduled" ? (
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                Starts {new Date(auction.startTime).toLocaleString("en-IN")}
              </div>
            ) : (
              <CountdownTimer endTime={auction.endTime} size="sm" />
            )}
            <p className="text-xs text-muted-foreground">{auction.bidCount} bids</p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button  type="button" className="flex-1" disabled={auction.status !== "live"}>
              Place Bid
            </Button>
            {auction.buyItNowPrice ? (
              <Badge variant="outline">BIN {formatCurrency(auction.buyItNowPrice)}</Badge>
            ) : null}
          </div>

          <div className="inline-flex items-center gap-1 text-xs text-primary">
            View details
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
