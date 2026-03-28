import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

import AutoBidModal from "@/components/auction/AutoBidModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "../ui/spinner"

type BidFormProps = {
  auctionId: string
  currentBid: number
  minBid: number
  isAuthenticated: boolean
  onPlaceBid: (amount: number, maxAutoBid?: number) => void
  onBuyNow?: () => void
  buyItNowPrice?: number
  isLive: boolean
  isPending: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

/**
 * Handles manual bid submission, optional buy-now action, and auto-bid setup.
 */
export default function BidForm({
  auctionId,
  currentBid,
  minBid,
  isAuthenticated,
  onPlaceBid,
  onBuyNow,
  buyItNowPrice,
  isLive,
  isPending,
}: BidFormProps) {
  const [amount, setAmount] = useState(minBid)
  const [error, setError] = useState<string | null>(null)
  const [isAutoBidModalOpen, setIsAutoBidModalOpen] = useState(false)

  useEffect(() => {
    setAmount(minBid)
  }, [minBid])

  const handlePlaceBid = (value: number, maxAutoBid?: number) => {
    if (value < minBid) {
      setError(`Bid must be at least ${formatCurrency(minBid)}`)
      return
    }

    setError(null)
    onPlaceBid(value, maxAutoBid)
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">Sign in to place bids on this auction.</p>
        <Button asChild className="mt-3">
          <Link to="/login" state={{ from: `/auctions/${auctionId}` }}>
            Sign in to bid
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Your Bid (min {formatCurrency(minBid)})</p>
        <Input
          type="number"
          min={minBid}
          step={1}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value || 0))}
          className="mt-2"
          disabled={!isLive || isPending}
        />
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>

      <Button
        type="button"
        className="w-full"
        
        size={"lg"}
        disabled={!isLive || isPending}
        onClick={() => handlePlaceBid(amount)}
      >
        {isPending ? <><Spinner /> Submitting...</> : "Place Bid"}
      </Button>

      {buyItNowPrice && onBuyNow ? (
        <>
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={!isLive || isPending}
            onClick={onBuyNow}
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
            Buy It Now - {formatCurrency(buyItNowPrice)}
          </Button>
        </>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={!isLive || isPending}
        onClick={() => setIsAutoBidModalOpen(true)}
      >
        Set Auto-Bid
      </Button>

      <AutoBidModal
        open={isAutoBidModalOpen}
        onOpenChange={setIsAutoBidModalOpen}
        currentBid={currentBid}
        minBid={minBid}
        isSubmitting={isPending}
        onPlaceBid={handlePlaceBid}
      />
    </div>
  )
}
