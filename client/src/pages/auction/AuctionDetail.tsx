import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  EyeIcon,
  StarIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons"
import { motion } from "framer-motion"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { getAuctionById, toggleWatch } from "@/api/auction.api"
import BidForm from "@/components/auction/BidForm"
import BidHistory from "@/components/auction/BidHistory"
import CountdownTimer from "@/components/auction/CountdownTimer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuctionSocket } from "@/hooks/useAuctionSocket"
import { useAuthStore } from "@/store/useAuthStore"
import type { Auction } from "@/api/auction.api"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

/**
 * Renders details and bid panel for a single auction.
 */
export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()

  const auctionQuery = useQuery({
    queryKey: ["auction", id],
    queryFn: () => getAuctionById(id || ""),
    enabled: Boolean(id),
  })

  const auction = auctionQuery.data

  if (auctionQuery.isLoading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[360px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </section>
    )
  }

  if (auctionQuery.isError || !auction) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      </section>
    )
  }

  return <AuctionDetailContent auction={auction} auctionId={id || ""} />
}

function AuctionDetailContent({ auction, auctionId }: { auction: Auction; auctionId: string }) {
  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token || state.accessToken || undefined)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isWatching, setIsWatching] = useState(false)
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsWatching(false)
      return
    }

    setIsWatching((auction.watchers || []).includes(user._id))
  }, [auction.watchers, user])

  const socketState = useAuctionSocket(auctionId, auction, token)

  const minBid = useMemo(() => socketState.currentBid + 1, [socketState.currentBid])

  useEffect(() => {
    if (!user?._id) {
      return
    }

    const isWinner = socketState.auctionStatus === "sold" && auction.winnerId === user._id

    if (isWinner) {
      setIsWinnerModalOpen(true)
    }
  }, [auction.winnerId, socketState.auctionStatus, user?._id])

  const images = auction.images?.length ? auction.images : ["https://placehold.co/1200x800?text=Auction"]
  const activeImage = images[Math.min(activeImageIndex, images.length - 1)]
  const isLive = socketState.auctionStatus === "live"

  const handleToggleWatch = async () => {
    if (!auctionId) {
      return
    }

    try {
      await toggleWatch(auctionId)
      setIsWatching((previousValue) => !previousValue)
      toast.success(isWatching ? "Removed from watchlist" : "Added to watchlist")
    } catch {
      toast.error("Could not update watchlist")
    }
  }

  const placeBid = (amount: number, maxAutoBid?: number) => {
    setIsSubmittingBid(true)
    socketState.placeBid(amount, maxAutoBid)
    window.setTimeout(() => setIsSubmittingBid(false), 700)
  }

  const buyNow = () => {
    setIsSubmittingBid(true)
    socketState.buyNow()
    window.setTimeout(() => setIsSubmittingBid(false), 700)
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate("/auctions")}>
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to Auctions
      </Button>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <img src={activeImage} alt={auction.title} className="h-[340px] w-full object-cover md:h-[420px]" />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`overflow-hidden rounded-md border ${
                  index === activeImageIndex ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <img src={image} alt={`${auction.title} ${index + 1}`} className="h-16 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <Card className="h-fit py-0">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={isLive ? "bg-amber-500 text-white" : ""} variant={isLive ? "default" : "outline"}>
                {socketState.auctionStatus.toUpperCase()}
              </Badge>
              <Badge variant={socketState.isConnected ? "secondary" : "outline"}>
                {socketState.isConnected ? "Connected" : "Reconnecting"}
              </Badge>
            </div>

            <h1 className="text-2xl font-semibold text-foreground">{auction.title}</h1>

            <div>
              <p className="text-xs text-muted-foreground">ENDS IN</p>
              <div className="mt-2">
                <CountdownTimer endTime={socketState.endTime} size="lg" />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Current Bid</p>
              <p className="text-3xl font-semibold text-foreground">{formatCurrency(socketState.currentBid)}</p>
              <p className="text-sm text-muted-foreground">
                {socketState.bidCount} bids · {socketState.viewerCount} watching
              </p>
            </div>

            <BidForm
              auctionId={auction._id}
              currentBid={socketState.currentBid}
              minBid={minBid}
              isAuthenticated={isAuthenticated}
              onPlaceBid={placeBid}
              onBuyNow={auction.buyItNowPrice ? buyNow : undefined}
              buyItNowPrice={auction.buyItNowPrice}
              isLive={isLive}
              isPending={isSubmittingBid}
            />

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={EyeIcon} className="size-4" />
                {socketState.viewerCount} watching
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleToggleWatch()}>
                <HugeiconsIcon icon={StarIcon} className="size-4" />
                {isWatching ? "Watching" : "Watch Auction"}
              </Button>
            </div>

            {socketState.lastBidError ? (
              <Alert variant="destructive">
                <AlertTitle>Bid failed</AlertTitle>
                <AlertDescription>{socketState.lastBidError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <BidHistory bids={socketState.bidHistory} currentUserId={user?._id} maxVisible={6} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Product Description</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{auction.description || "No description provided."}</p>
      </div>

      <Dialog open={isWinnerModalOpen} onOpenChange={setIsWinnerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5 text-primary" />
              Congratulations
            </DialogTitle>
            <DialogDescription>You won this auction.</DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            Winning Bid: <span className="font-semibold text-foreground">{formatCurrency(socketState.currentBid)}</span>
          </div>

          <motion.div className="pointer-events-none relative h-8 overflow-hidden" initial={false}>
            {Array.from({ length: 10 }).map((_, index) => (
              <motion.span
                key={index}
                className="absolute top-0 size-2 rounded-full bg-primary/70"
                initial={{ x: `${10 * index}%`, y: -8, opacity: 1 }}
                animate={{ y: 28, opacity: 0 }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
              />
            ))}
          </motion.div>

          <DialogFooter>
            <Button asChild>
              <Link to="/orders">
                <HugeiconsIcon icon={ShoppingBag01Icon} className="size-4" />
                View Your Order
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
