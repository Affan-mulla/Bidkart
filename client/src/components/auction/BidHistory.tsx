import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { type AuctionBid } from "@/api/auction.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BidHistoryProps = {
  bids: AuctionBid[]
  currentUserId?: string
  maxVisible?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const formatRelative = (timestamp: string, now: number) => {
  const targetTime = new Date(timestamp).getTime()
  const diffSeconds = Math.max(0, Math.floor((now - targetTime) / 1000))

  if (diffSeconds < 15) {
    return "just now"
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }

  const diffMinutes = Math.floor(diffSeconds / 60)

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} hr ago`
  }

  return `${Math.floor(diffHours / 24)} day ago`
}

/**
 * Renders latest bids with animated inserts and relative timestamps.
 */
export default function BidHistory({ bids, currentUserId, maxVisible = 5 }: BidHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const sortedBids = useMemo(
    () => [...bids].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [bids],
  )

  const visibleBids = showAll ? sortedBids : sortedBids.slice(0, maxVisible)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Bid History</h3>
        <p className="text-xs text-muted-foreground">{sortedBids.length} total bids</p>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visibleBids.map((bid) => {
            const isCurrentUserBid = currentUserId && currentUserId === bid.bidderId

            return (
              <motion.div
                key={`${bid.bidderId}-${bid.timestamp}-${bid.amount}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2",
                  isCurrentUserBid ? "border-primary/40 bg-primary/5" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{bid.bidderName}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(bid.timestamp, now)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(bid.amount)}</span>
                  {bid.isAutoBid ? <Badge variant="secondary">Auto</Badge> : null}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {sortedBids.length > maxVisible ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show less" : `Show all ${sortedBids.length} bids`}
        </Button>
      ) : null}
    </div>
  )
}
