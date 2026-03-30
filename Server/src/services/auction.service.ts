import { FilterQuery, SortOrder, Types } from "mongoose";
import Auction, {
  IAuction,
  IAuctionAutoBid,
  IAuctionBid,
  IAuctionDocument,
} from "../models/Auction.model";
import Order from "../models/Order.model";
import Product from "../models/Product.model";
import User from "../models/User.model";
import AppError from "../utils/appError";
import { io } from "../sockets";
import { createNotification } from "./notification.service";


interface CreateAuctionInput {
  productId: string;
  startPrice: number;
  reservePrice?: number;
  buyItNowPrice?: number;
  startTime: string | Date;
  endTime: string | Date;
}

interface ProductSnapshot {
  title: string;
  images: string[];
  description: string;
}

interface AuctionQueryFilters {
  status?: IAuction["status"];
  category?: string;
  sellerId?: string;
  sort?: "ending_soon" | "newest" | "most_bids";
  page?: number;
  limit?: number;
}

interface PlaceBidResult {
  auction: IAuctionDocument;
  outbidUserId?: string;
  autoBidPlaced?: IAuctionBid;
}

interface StoredAddress {
  fullName?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  pincode?: unknown;
  isDefault?: unknown;
}

const MAX_BID_HISTORY = 500;
const BID_INCREMENT = 1;

/**
 * Resolve a winner shipping address from user address book.
 */
const getWinnerShippingAddress = async (winnerId: Types.ObjectId) => {
  const winner = await User.findById(winnerId).select("addresses");

  if (!winner) {
    return null;
  }

  const addresses = Array.isArray(winner.addresses)
    ? (winner.addresses as StoredAddress[])
    : [];

  const hasRequiredFields = (address: StoredAddress) => {
    const requiredValues = [
      address.fullName,
      address.phone,
      address.addressLine1,
      address.city,
      address.state,
      address.pincode,
    ];

    return requiredValues.every((value) => String(value || "").trim().length > 0);
  };

  const defaultAddress = addresses.find((address) => Boolean(address?.isDefault));
  const selectedAddress = hasRequiredFields(defaultAddress || {})
    ? defaultAddress
    : addresses.find((address) => hasRequiredFields(address));

  if (!selectedAddress) {
    return null;
  }

  return {
    fullName: String(selectedAddress.fullName).trim(),
    phone: String(selectedAddress.phone).trim(),
    addressLine1: String(selectedAddress.addressLine1).trim(),
    addressLine2: String(selectedAddress.addressLine2 || "").trim(),
    city: String(selectedAddress.city).trim(),
    state: String(selectedAddress.state).trim(),
    pincode: String(selectedAddress.pincode).trim(),
  };
};

/**
 * Ensure string is a valid MongoDB ObjectId.
 */
const ensureObjectId = (id: string, message: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(message, 400);
  }
};



/**
 * Build safe public auction response.
 */
const toPublicAuction = (auction: IAuctionDocument | (IAuction & { _id: Types.ObjectId })) => {
  const rawAuction = typeof (auction as IAuctionDocument).toObject === "function"
    ? (auction as IAuctionDocument).toObject()
    : auction;

  const { reservePrice: _hiddenReservePrice, autoBids: _hiddenAutoBids, ...safeAuction } =
    rawAuction as unknown as Record<string, unknown>;

  return safeAuction;
};

/**
 * Create an auction from product snapshot and seller input.
 */
export const createAuction = async (
  sellerId: string,
  data: CreateAuctionInput,
  productSnapshot: ProductSnapshot
): Promise<IAuctionDocument> => {
  ensureObjectId(sellerId, "Invalid seller id");
  ensureObjectId(data.productId, "Invalid product id");

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError("Invalid auction schedule", 400);
  }

  if (startTime.getTime() <= Date.now()) {
    throw new AppError("startTime must be in the future", 400);
  }

  if (endTime <= startTime) {
    throw new AppError("endTime must be greater than startTime", 400);
  }

  if (data.buyItNowPrice !== undefined && data.buyItNowPrice <= data.startPrice) {
    throw new AppError("buyItNowPrice must be greater than startPrice", 400);
  }

  const auction = await Auction.create({
    sellerId: new Types.ObjectId(sellerId),
    productId: new Types.ObjectId(data.productId),
    title: productSnapshot.title,
    images: productSnapshot.images,
    description: productSnapshot.description,
    startPrice: data.startPrice,
    reservePrice: data.reservePrice,
    buyItNowPrice: data.buyItNowPrice,
    currentBid: data.startPrice,
    bidCount: 0,
    startTime,
    endTime,
    originalEndTime: endTime,
    status: startTime.getTime() <= Date.now() ? "live" : "scheduled",
    escrowStatus: "none",
    bids: [],
    autoBids: [],
    views: 0,
    watchers: [],
  });

  return auction;
};

/**
 * Fetch paginated auctions with filters and sorting.
 */
export const getAuctions = async (filters: AuctionQueryFilters) => {
  const parsedPage = Math.max(1, filters.page || 1);
  const parsedLimit = Math.max(1, Math.min(50, filters.limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query: FilterQuery<IAuction> = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.sellerId) {
    ensureObjectId(filters.sellerId, "Invalid seller id");
    query.sellerId = new Types.ObjectId(filters.sellerId);
  }

  if (filters.category) {
    query.$or = [
      { title: { $regex: filters.category, $options: "i" } },
      { description: { $regex: filters.category, $options: "i" } },
    ];
  }

  const sortMap: Record<string, Record<string, SortOrder>> = {
    ending_soon: { endTime: 1 },
    newest: { createdAt: -1 },
    most_bids: { bidCount: -1 },
  };

  const sort = sortMap[filters.sort || "newest"] || sortMap.newest;

  const [auctions, total] = await Promise.all([
    Auction.find(query)
      .select("-reservePrice -autoBids")
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit),
    Auction.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

  return {
    auctions: auctions.map((auction) => toPublicAuction(auction)),
    total,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fetch auction detail and remove private auto-bid amounts.
 */
export const getAuctionById = async (auctionId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");

  const auction = await Auction.findById(auctionId).select("+autoBids");

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  const rawAuction = auction.toObject() as unknown as Record<string, unknown>;
  const { reservePrice: _hiddenReservePrice, autoBids = [], ...safeAuction } = rawAuction;

  const safeAutoBids = (autoBids as IAuctionAutoBid[]).map((autoBid) => ({
    bidderId: autoBid.bidderId,
    incrementAmount: autoBid.incrementAmount,
  }));

  return {
    ...safeAuction,
    autoBids: safeAutoBids,
  };
};

/**
 * Persist bidder auto-bid strategy.
 */
const upsertAutoBid = async (
  auctionId: Types.ObjectId,
  bidderId: Types.ObjectId,
  maxAutoBid: number
) => {
  const incrementAmount = BID_INCREMENT;

  const updatedExisting = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      "autoBids.bidderId": bidderId,
    },
    {
      $set: {
        "autoBids.$.maxAmount": maxAutoBid,
        "autoBids.$.incrementAmount": incrementAmount,
      },
    },
    { new: true }
  );

  if (updatedExisting) {
    return;
  }

  await Auction.findByIdAndUpdate(auctionId, {
    $push: {
      autoBids: {
        bidderId,
        maxAmount: maxAutoBid,
        incrementAmount,
      },
    },
  });
};

/**
 * Process auto-bids and set a new leading bidder when eligible.
 */
export const processAutoBids = async (
  auctionId: string,
  triggeredByBidderId: string,
  newBid: number
): Promise<PlaceBidResult> => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(triggeredByBidderId, "Invalid bidder id");

  const auction = await Auction.findById(auctionId).select("+autoBids");

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  const triggeredBidderId = new Types.ObjectId(triggeredByBidderId);
  const autoBidsWithPosition = auction.autoBids
    .map((autoBid, index) => ({ autoBid, index }))
    .filter(
      ({ autoBid }) =>
        String(autoBid.bidderId) !== String(triggeredBidderId) && autoBid.maxAmount > newBid
    )
    .sort((left, right) => {
      if (right.autoBid.maxAmount !== left.autoBid.maxAmount) {
        return right.autoBid.maxAmount - left.autoBid.maxAmount;
      }

      return left.index - right.index;
    });

  const topAutoBidderEntry = autoBidsWithPosition[0];
  if (!topAutoBidderEntry) {
    return { auction };
  }

  const triggeredAutoBid = auction.autoBids.find(
    (entry) => String(entry.bidderId) === String(triggeredBidderId)
  );

  const topAutoBidder = topAutoBidderEntry.autoBid;
  const counterBid = Math.min(newBid + topAutoBidder.incrementAmount, topAutoBidder.maxAmount);

  if (triggeredAutoBid && counterBid <= triggeredAutoBid.maxAmount) {
    return { auction };
  }

  const autoBidderUser = await User.findById(topAutoBidder.bidderId).select("name");
  const autoBidBidderName = autoBidderUser?.name || "Auto Bidder";

  const autoBidRecord: IAuctionBid = {
    bidderId: topAutoBidder.bidderId,
    bidderName: autoBidBidderName,
    amount: counterBid,
    isAutoBid: true,
    timestamp: new Date(),
  };

  const updatedAuction = await Auction.findOneAndUpdate(
    {
      _id: auction._id,
      status: "live",
      currentBid: newBid,
      currentBidderId: triggeredBidderId,
    },
    {
      $set: {
        currentBid: counterBid,
        currentBidderId: topAutoBidder.bidderId,
      },
      $inc: {
        bidCount: 1,
      },
      $push: {
        bids: {
          $each: [autoBidRecord],
          $slice: -MAX_BID_HISTORY,
        },
      },
    },
    {
      new: true,
    }
  );

  if (!updatedAuction) {
    throw new AppError("Auction changed while processing auto bid. Retry bid.", 409);
  }

  io?.to(String(auction._id)).emit("auction:bid_placed", {
    auctionId: String(auction._id),
    bid: autoBidRecord,
    currentBid: updatedAuction.currentBid,
    bidCount: updatedAuction.bidCount,
  });

  io?.to(`user:${triggeredByBidderId}`).emit("auction:outbid", {
    auctionId: String(auction._id),
    message: "You were outbid by an auto-bidder",
  });

  return {
    auction: updatedAuction,
    outbidUserId: triggeredByBidderId,
    autoBidPlaced: autoBidRecord,
  };
};

/**
 * Place a live bid with anti-snipe extension and auto-bid handling.
 */
export const placeBid = async (
  auctionId: string,
  bidderId: string,
  bidderName: string,
  amount: number,
  maxAutoBid?: number
): Promise<IAuctionDocument> => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(bidderId, "Invalid bidder id");

  if (!bidderName.trim()) {
    throw new AppError("Bidder name is required", 400);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Invalid bid amount", 400);
  }

  const now = new Date();
  const auction = await Auction.findOneAndUpdate(
    {
      _id: new Types.ObjectId(auctionId),
      status: "live",
    },
    {
      $set: {
        updatedAt: now,
      },
    },
    {
      new: true,
    }
  ).select("+autoBids +reservePrice");

  if (!auction) {
    throw new AppError("Auction is not live", 400);
  }

  if (String(auction.sellerId) === bidderId) {
    throw new AppError("Sellers cannot bid on their own auctions", 403);
  }

  if (auction.endTime.getTime() <= now.getTime()) {
    throw new AppError("Auction already ended", 400);
  }

  if (auction.currentBidderId && String(auction.currentBidderId) === bidderId) {
    throw new AppError("You are already the highest bidder", 400);
  }

  if (amount < auction.currentBid + BID_INCREMENT) {
    throw new AppError(`Bid must be at least current bid + ${BID_INCREMENT}`, 400);
  }

  if (maxAutoBid !== undefined) {
    if (!Number.isFinite(maxAutoBid) || maxAutoBid < amount) {
      throw new AppError("maxAutoBid must be greater than or equal to amount", 400);
    }

    await upsertAutoBid(
      auction._id as Types.ObjectId,
      new Types.ObjectId(bidderId),
      maxAutoBid
    );
  }

  const shouldExtendAuction = auction.endTime.getTime() - now.getTime() < 2 * 60 * 1000;
  const extendedEndTime = shouldExtendAuction
    ? new Date(auction.endTime.getTime() + 2 * 60 * 1000)
    : auction.endTime;

  const bidRecord: IAuctionBid = {
    bidderId: new Types.ObjectId(bidderId),
    bidderName,
    amount,
    isAutoBid: false,
    timestamp: now,
  };

  const updatedAuction = await Auction.findOneAndUpdate(
    {
      _id: auction._id,
      status: "live",
      currentBid: auction.currentBid,
      endTime: auction.endTime,
      ...(auction.currentBidderId
        ? { currentBidderId: auction.currentBidderId }
        : { currentBidderId: null }),
    },
    {
      $set: {
        currentBid: amount,
        currentBidderId: new Types.ObjectId(bidderId),
        ...(shouldExtendAuction ? { endTime: extendedEndTime } : {}),
      },
      $inc: {
        bidCount: 1,
      },
      $push: {
        bids: {
          $each: [bidRecord],
          $slice: -MAX_BID_HISTORY,
        },
      },
    },
    { new: true }
  );

  if (!updatedAuction) {
    throw new AppError("Auction changed while placing bid. Retry bid.", 409);
  }

  io?.to(String(updatedAuction._id)).emit("auction:bid_placed", {
    auctionId: String(updatedAuction._id),
    bid: bidRecord,
    currentBid: updatedAuction.currentBid,
    bidCount: updatedAuction.bidCount,
  });

  if (shouldExtendAuction) {
    io?.to(String(updatedAuction._id)).emit("auction:extended", {
      auctionId: String(updatedAuction._id),
      newEndTime: extendedEndTime,
    });
  }

  const previousBidderId = auction.currentBidderId ? String(auction.currentBidderId) : undefined;
  if (previousBidderId) {
    io?.to(`user:${previousBidderId}`).emit("auction:outbid", {
      auctionId: String(updatedAuction._id),
      message: "You were outbid",
    });
  }

  const autoBidResult = await processAutoBids(auctionId, bidderId, amount);
  const finalAuction = autoBidResult.auction;

  if (finalAuction.buyItNowPrice && finalAuction.currentBid >= finalAuction.buyItNowPrice) {
    await endAuction(String(finalAuction._id));
    const endedAuction = await Auction.findById(finalAuction._id);

    if (!endedAuction) {
      throw new AppError("Auction not found", 404);
    }

    return endedAuction;
  }

  return finalAuction;
};

/**
 * End auction and create winner order when reserve rules are met.
 */
export const endAuction = async (auctionId: string): Promise<IAuctionDocument> => {
  ensureObjectId(auctionId, "Invalid auction id");

  const auction = await Auction.findById(auctionId).select("+reservePrice");

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  if (auction.status === "ended" || auction.status === "sold" || auction.status === "cancelled") {
    return auction;
  }

  const hasWinner =
    auction.currentBidderId &&
    (auction.reservePrice === undefined || auction.reservePrice === null
      ? true
      : auction.currentBid >= auction.reservePrice);

  auction.status = hasWinner ? "sold" : "ended";

  if (hasWinner && auction.currentBidderId) {
    auction.winnerId = auction.currentBidderId;

    const shippingAddress = await getWinnerShippingAddress(auction.currentBidderId);

    if (shippingAddress) {
      const winnerOrder = await Order.create({
        buyerId: auction.currentBidderId,
        items: [
          {
            productId: auction.productId,
            sellerId: auction.sellerId,
            title: auction.title,
            image: auction.images[0] || "",
            variantKey: "",
            variantValue: "",
            quantity: 1,
            price: auction.currentBid,
            itemTotal: auction.currentBid,
          },
        ],
        shippingAddress,
        subtotal: auction.currentBid,
        deliveryCharge: 0,
        totalAmount: auction.currentBid,
        status: "Placed",
        paymentMethod: "COD",
        paymentStatus: "Pending",
        cancelReason: "",
      });

      auction.winnerOrderId = winnerOrder._id as Types.ObjectId;
    }

    await createNotification(String(auction.currentBidderId), {
      type: "auction_won",
      title: "You won the auction!",
      message: shippingAddress
        ? `Congratulations! You won "${auction.title}" with a bid of ₹${auction.currentBid.toLocaleString("en-IN")}.`
        : `You won "${auction.title}" with a bid of ₹${auction.currentBid.toLocaleString("en-IN")}. Add a delivery address to proceed with order processing.`,
      link: shippingAddress ? "/orders" : "/profile",
    });
  }

  // Guard against legacy negative counters so auction lifecycle save does not fail.
  auction.views = Math.max(0, Number(auction.views) || 0);

  await auction.save();

  io?.to(String(auction._id)).emit("auction:ended", {
    auctionId: String(auction._id),
    winnerId: auction.winnerId ? String(auction.winnerId) : null,
    winningBid: auction.currentBid,
    productTitle: auction.title,
    winnerOrderId: auction.winnerOrderId ? String(auction.winnerOrderId) : null,
  });

  return auction;
};

/**
 * Cancel unpaid auction winner orders that exceeded payment deadline.
 */
export const cancelExpiredAuctionOrders = async () => {
  return;
};

/**
 * Start auctions that reached start time.
 */
export const startScheduledAuctions = async () => {
  const now = new Date();

  const auctions = await Auction.find({
    status: "scheduled",
    startTime: { $lte: now },
  }).select("_id");

  if (auctions.length === 0) {
    return;
  }

  const auctionIds = auctions.map((auction) => auction._id);

  await Auction.updateMany(
    {
      _id: { $in: auctionIds },
      status: "scheduled",
    },
    {
      $set: {
        status: "live",
      },
    }
  );

  auctions.forEach((auction) => {
    io?.to(String(auction._id)).emit("auction:status_change", {
      auctionId: String(auction._id),
      status: "live",
    });
  });
};

/**
 * End all live auctions that passed end time.
 */
export const endExpiredAuctions = async () => {
  const now = new Date();

  const expiredAuctions = await Auction.find({
    status: "live",
    endTime: { $lte: now },
  }).select("_id");

  const results = await Promise.allSettled(
    expiredAuctions.map((auction) => endAuction(String(auction._id)))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const failedAuctionId = String(expiredAuctions[index]?._id || "unknown");
      console.error(`Failed to end auction ${failedAuctionId}:`, result.reason);
    }
  });
};

/**
 * Toggle auction watch list for user.
 */
export const toggleWatch = async (auctionId: string, userId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(userId, "Invalid user id");

  const existingWatch = await Auction.findOne({
    _id: new Types.ObjectId(auctionId),
    watchers: new Types.ObjectId(userId),
  }).select("_id");

  const updatedAuction = await Auction.findByIdAndUpdate(
    auctionId,
    existingWatch
      ? { $pull: { watchers: new Types.ObjectId(userId) } }
      : { $addToSet: { watchers: new Types.ObjectId(userId) } },
    { new: true }
  ).select("watchers");

  if (!updatedAuction) {
    throw new AppError("Auction not found", 404);
  }

  return {
    watching: !existingWatch,
    watchersCount: updatedAuction.watchers.length,
  };
};

/**
 * Buy auction instantly using buy-it-now price.
 */
export const buyItNow = async (auctionId: string, buyerId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(buyerId, "Invalid buyer id");

  const auction = await Auction.findById(auctionId);

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  if (String(auction.sellerId) === buyerId) {
    throw new AppError("Sellers cannot use buy-it-now on their own auctions", 403);
  }

  if (auction.status !== "live") {
    throw new AppError("Auction is not live", 400);
  }

  if (!auction.buyItNowPrice) {
    throw new AppError("Buy it now is not available for this auction", 400);
  }

  auction.currentBid = auction.buyItNowPrice;
  auction.currentBidderId = new Types.ObjectId(buyerId);
  auction.bidCount += 1;
  auction.bids.push({
    bidderId: new Types.ObjectId(buyerId),
    bidderName: "Buy It Now",
    amount: auction.buyItNowPrice,
    isAutoBid: false,
    timestamp: new Date(),
  });

  if (auction.bids.length > MAX_BID_HISTORY) {
    auction.bids = auction.bids.slice(-MAX_BID_HISTORY);
  }

  await auction.save();
  return endAuction(String(auction._id));
};

/**
 * Update seller auction while still scheduled.
 */
export const updateAuction = async (
  auctionId: string,
  sellerId: string,
  payload: Partial<CreateAuctionInput>
) => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(sellerId, "Invalid seller id");

  const auction = await Auction.findOne({
    _id: new Types.ObjectId(auctionId),
    sellerId: new Types.ObjectId(sellerId),
  });

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  if (auction.status !== "scheduled") {
    throw new AppError("Only scheduled auctions can be updated", 400);
  }

  if (payload.startTime !== undefined) {
    const nextStartTime = new Date(payload.startTime);

    if (Number.isNaN(nextStartTime.getTime()) || nextStartTime.getTime() <= Date.now()) {
      throw new AppError("startTime must be in the future", 400);
    }

    auction.startTime = nextStartTime;
  }

  if (payload.endTime !== undefined) {
    const nextEndTime = new Date(payload.endTime);

    if (Number.isNaN(nextEndTime.getTime()) || nextEndTime <= auction.startTime) {
      throw new AppError("endTime must be greater than startTime", 400);
    }

    auction.endTime = nextEndTime;
    auction.originalEndTime = nextEndTime;
  }

  if (payload.startPrice !== undefined) {
    if (payload.startPrice <= 0) {
      throw new AppError("startPrice must be greater than 0", 400);
    }

    auction.startPrice = payload.startPrice;
    auction.currentBid = payload.startPrice;
  }

  if (payload.reservePrice !== undefined) {
    auction.reservePrice = payload.reservePrice;
  }

  if (payload.buyItNowPrice !== undefined) {
    auction.buyItNowPrice = payload.buyItNowPrice;
  }

  await auction.save();

  return auction;
};

/**
 * Cancel a seller auction if still scheduled.
 */
export const cancelAuction = async (auctionId: string, sellerId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");
  ensureObjectId(sellerId, "Invalid seller id");

  const auction = await Auction.findOne({
    _id: new Types.ObjectId(auctionId),
    sellerId: new Types.ObjectId(sellerId),
  });

  if (!auction) {
    throw new AppError("Auction not found", 404);
  }

  if (auction.status !== "scheduled") {
    throw new AppError("Only scheduled auctions can be cancelled", 400);
  }

  auction.status = "cancelled";
  await auction.save();

  io?.to(String(auction._id)).emit("auction:status_change", {
    auctionId: String(auction._id),
    status: "cancelled",
  });

  return auction;
};

/**
 * Fetch seller-owned auctions.
 */
export const getMyAuctions = async (sellerId: string, page = 1, limit = 10) => {
  ensureObjectId(sellerId, "Invalid seller id");

  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { sellerId: new Types.ObjectId(sellerId) };

  const [auctions, total] = await Promise.all([
    Auction.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).select("-autoBids"),
    Auction.countDocuments(query),
  ]);

  return {
    auctions,
    total,
    page: parsedPage,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

/**
 * Increment auction views counter.
 */
export const incrementViews = async (auctionId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");

  await Auction.findByIdAndUpdate(auctionId, {
    $inc: { views: 1 },
  });
};

/**
 * Decrement auction views counter.
 */
export const decrementViews = async (auctionId: string) => {
  ensureObjectId(auctionId, "Invalid auction id");

  await Auction.findOneAndUpdate(
    {
      _id: new Types.ObjectId(auctionId),
      views: { $gt: 0 },
    },
    {
      $inc: { views: -1 },
    }
  );
};
