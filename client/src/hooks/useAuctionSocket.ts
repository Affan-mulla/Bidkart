import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { type Auction, type AuctionBid } from "@/api/auction.api"
import { getSocket, disconnectSocket } from "@/lib/socket"
import { useAuthStore } from "@/store/useAuthStore"

type AuctionEndedPayload = {
  auctionId: string
  winnerId: string | null
  winningBid: number
  productTitle?: string
}

type AuctionBidPlacedPayload = {
  auctionId: string
  bid: AuctionBid
  currentBid: number
  bidCount: number
}

type AuctionBidFailedPayload = {
  auctionId?: string
  reason: string
}

type AuctionExtendedPayload = {
  auctionId: string
  newEndTime: string
}

type AuctionStatusPayload = {
  auctionId: string
  status: Auction["status"]
}

type ViewerCountPayload = {
  auctionId: string
  count: number
}

interface UseAuctionSocketReturn {
  currentBid: number
  bidCount: number
  bidHistory: AuctionBid[]
  viewerCount: number
  auctionStatus: Auction["status"]
  endTime: Date
  isConnected: boolean
  placeBid: (amount: number, maxAutoBid?: number) => void
  buyNow: () => void
  lastBidError: string | null
}

/**
 * Subscribes to auction room socket events and keeps local auction state in sync.
 */
export function useAuctionSocket(
  auctionId: string,
  initialAuction: Auction,
  accessToken?: string,
): UseAuctionSocketReturn {
  const currentUserId = useAuthStore((state) => state.user?._id)

  const [currentBid, setCurrentBid] = useState(initialAuction.currentBid)
  const [bidCount, setBidCount] = useState(initialAuction.bidCount)
  const [bidHistory, setBidHistory] = useState<AuctionBid[]>(initialAuction.bids || [])
  const [viewerCount, setViewerCount] = useState(initialAuction.views || 0)
  const [auctionStatus, setAuctionStatus] = useState<Auction["status"]>(initialAuction.status)
  const [endTime, setEndTime] = useState<Date>(new Date(initialAuction.endTime))
  const [isConnected, setIsConnected] = useState(false)
  const [lastBidError, setLastBidError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentBid(initialAuction.currentBid)
    setBidCount(initialAuction.bidCount)
    setBidHistory(initialAuction.bids || [])
    setViewerCount(initialAuction.views || 0)
    setAuctionStatus(initialAuction.status)
    setEndTime(new Date(initialAuction.endTime))
  }, [initialAuction])

  const socket = useMemo(() => getSocket(accessToken), [accessToken])

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true)
      socket.emit("auction:join", { auctionId })
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    const onBidPlaced = (payload: AuctionBidPlacedPayload) => {
      if (payload.auctionId !== auctionId) {
        return
      }

      setCurrentBid(payload.currentBid)
      setBidCount(payload.bidCount)
      setBidHistory((previousBids) => {
        const nextBids = [payload.bid, ...previousBids]
        return nextBids.slice(0, 100)
      })
      setLastBidError(null)
    }

    const onOutbid = () => {
      toast.error("You've been outbid! Place a higher bid.")
    }

    const onBidFailed = (payload: AuctionBidFailedPayload) => {
      if (payload.auctionId && payload.auctionId !== auctionId) {
        return
      }

      const reason = payload.reason || "Unable to place bid"
      setLastBidError(reason)
      toast.error(reason)
    }

    const onExtended = (payload: AuctionExtendedPayload) => {
      if (payload.auctionId !== auctionId) {
        return
      }

      setEndTime(new Date(payload.newEndTime))
      toast.info("Auction extended by 2 minutes!")
    }

    const onEnded = (payload: AuctionEndedPayload) => {
      if (payload.auctionId !== auctionId) {
        return
      }

      setAuctionStatus(payload.winnerId ? "sold" : "ended")

      if (!payload.winnerId) {
        toast.info("Auction ended")
        return
      }

      if (payload.winnerId === currentUserId) {
        toast.success("You won this auction")
      } else {
        toast.info("Auction ended. Better luck in the next one.")
      }
    }

    const onStatusChange = (payload: AuctionStatusPayload) => {
      if (payload.auctionId !== auctionId) {
        return
      }

      setAuctionStatus(payload.status)
    }

    const onViewerCount = (payload: ViewerCountPayload) => {
      if (payload.auctionId !== auctionId) {
        return
      }

      setViewerCount(payload.count)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("auction:bid_placed", onBidPlaced)
    socket.on("auction:outbid", onOutbid)
    socket.on("auction:bid_failed", onBidFailed)
    socket.on("auction:extended", onExtended)
    socket.on("auction:ended", onEnded)
    socket.on("auction:status_change", onStatusChange)
    socket.on("auction:viewer_count", onViewerCount)

    if (socket.connected) {
      onConnect()
    }

    return () => {
      socket.emit("auction:leave", { auctionId })
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("auction:bid_placed", onBidPlaced)
      socket.off("auction:outbid", onOutbid)
      socket.off("auction:bid_failed", onBidFailed)
      socket.off("auction:extended", onExtended)
      socket.off("auction:ended", onEnded)
      socket.off("auction:status_change", onStatusChange)
      socket.off("auction:viewer_count", onViewerCount)
      disconnectSocket()
    }
  }, [auctionId, currentUserId, socket])

  const placeBid = (amount: number, maxAutoBid?: number) => {
    setLastBidError(null)
    socket.emit("auction:place_bid", {
      auctionId,
      amount,
      ...(maxAutoBid !== undefined ? { maxAutoBid } : {}),
    })
  }

  const buyNow = () => {
    socket.emit("auction:buy_now", { auctionId })
  }

  return {
    currentBid,
    bidCount,
    bidHistory,
    viewerCount,
    auctionStatus,
    endTime,
    isConnected,
    placeBid,
    buyNow,
    lastBidError,
  }
}
