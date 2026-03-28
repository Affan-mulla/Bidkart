import { Server as SocketServer, Socket } from "socket.io";
import User from "../models/User.model";
import AppError from "../utils/appError";
import {
  buyItNow,
  decrementViews,
  incrementViews,
  placeBid,
} from "../services/auction.service";

interface JoinAuctionPayload {
  auctionId: string;
}

interface PlaceBidPayload {
  auctionId: string;
  amount: number;
  maxAutoBid?: number;
}

interface BuyNowPayload {
  auctionId: string;
}

interface AuctionEndedPayload {
  auctionId: string;
  winnerId?: string | null;
  winningBid: number;
  productTitle: string;
  winnerOrderId?: string | null;
}

/**
 * Register all real-time auction events for a socket connection.
 */
export const registerAuctionHandlers = (io: SocketServer, socket: Socket) => {
  socket.on("auction:join", async (payload: JoinAuctionPayload) => {
    try {
      if (!payload?.auctionId) {
        throw new AppError("auctionId is required", 400);
      }

      await socket.join(payload.auctionId);
      await incrementViews(payload.auctionId);

      const roomSize = io.sockets.adapter.rooms.get(payload.auctionId)?.size || 0;

      io.to(payload.auctionId).emit("auction:viewer_count", {
        auctionId: payload.auctionId,
        count: roomSize,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to join auction";
      socket.emit("auction:bid_failed", {
        auctionId: payload?.auctionId,
        reason,
      });
    }
  });

  socket.on("auction:leave", async (payload: JoinAuctionPayload) => {
    if (!payload?.auctionId) {
      return;
    }

    await socket.leave(payload.auctionId);
    await decrementViews(payload.auctionId);

    const roomSize = io.sockets.adapter.rooms.get(payload.auctionId)?.size || 0;

    io.to(payload.auctionId).emit("auction:viewer_count", {
      auctionId: payload.auctionId,
      count: roomSize,
    });
  });

  socket.on("auction:place_bid", async (payload: PlaceBidPayload) => {
    try {
      const userId = socket.data.userId as string | undefined;

      if (!userId) {
        throw new AppError("Unauthorized", 401);
      }

      if (!payload?.auctionId || !payload?.amount) {
        throw new AppError("auctionId and amount are required", 400);
      }

      const bidder = await User.findById(userId).select("name");

      if (!bidder) {
        throw new AppError("User not found", 404);
      }

      const auction = await placeBid(
        payload.auctionId,
        userId,
        bidder.name,
        Number(payload.amount),
        payload.maxAutoBid !== undefined ? Number(payload.maxAutoBid) : undefined
      );

      io.to(payload.auctionId).emit("auction:bid_placed", {
        auctionId: payload.auctionId,
        bid: auction.bids[auction.bids.length - 1],
        currentBid: auction.currentBid,
        bidCount: auction.bidCount,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to place bid";

      socket.emit("auction:bid_failed", {
        auctionId: payload?.auctionId,
        reason,
      });
    }
  });

  socket.on("auction:buy_now", async (payload: BuyNowPayload) => {
    try {
      const userId = socket.data.userId as string | undefined;

      if (!userId) {
        throw new AppError("Unauthorized", 401);
      }

      if (!payload?.auctionId) {
        throw new AppError("auctionId is required", 400);
      }

      const auction = await buyItNow(payload.auctionId, userId);

      const endedPayload: AuctionEndedPayload = {
        auctionId: payload.auctionId,
        winnerId: auction.winnerId ? String(auction.winnerId) : null,
        winningBid: auction.currentBid,
        productTitle: auction.title,
        winnerOrderId: auction.winnerOrderId ? String(auction.winnerOrderId) : null,
      };

      io.to(payload.auctionId).emit("auction:ended", endedPayload);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to complete buy now";

      socket.emit("auction:bid_failed", {
        auctionId: payload?.auctionId,
        reason,
      });
    }
  });
};
