import { Document, Schema, Types, model } from "mongoose";

export type AuctionStatus = "scheduled" | "live" | "ended" | "cancelled" | "sold";
export type EscrowStatus = "none" | "held" | "released" | "refunded";

export interface IAuctionBid {
  bidderId: Types.ObjectId;
  bidderName: string;
  amount: number;
  isAutoBid: boolean;
  timestamp: Date;
}

export interface IAuctionAutoBid {
  bidderId: Types.ObjectId;
  maxAmount: number;
  incrementAmount: number;
}

export interface IAuction {
  sellerId: Types.ObjectId;
  productId: Types.ObjectId;
  title: string;
  images: string[];
  description: string;
  startPrice: number;
  reservePrice?: number;
  buyItNowPrice?: number;
  currentBid: number;
  currentBidderId?: Types.ObjectId;
  bidCount: number;
  startTime: Date;
  endTime: Date;
  originalEndTime: Date;
  status: AuctionStatus;
  winnerId?: Types.ObjectId;
  winnerOrderId?: Types.ObjectId;
  escrowStatus: EscrowStatus;
  bids: IAuctionBid[];
  autoBids: IAuctionAutoBid[];
  views: number;
  watchers: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type IAuctionDocument = Document<unknown, object, IAuction> & IAuction;

const auctionBidSchema = new Schema<IAuctionBid>(
  {
    bidderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bidderName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    isAutoBid: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const auctionAutoBidSchema = new Schema<IAuctionAutoBid>(
  {
    bidderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    maxAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    incrementAmount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const auctionSchema = new Schema<IAuction>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    startPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    reservePrice: {
      type: Number,
      default: null,
      min: 1,
      select: false,
    },
    buyItNowPrice: {
      type: Number,
      default: null,
      min: 1,
    },
    currentBid: {
      type: Number,
      required: true,
      min: 1,
    },
    currentBidderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    bidCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    originalEndTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "cancelled", "sold"],
      default: "scheduled",
      index: true,
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    winnerOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    escrowStatus: {
      type: String,
      enum: ["none", "held", "released", "refunded"],
      default: "none",
    },
    bids: {
      type: [auctionBidSchema],
      default: [],
    },
    autoBids: {
      type: [auctionAutoBidSchema],
      default: [],
      select: false,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    watchers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

auctionSchema.index({ status: 1 });
auctionSchema.index({ sellerId: 1 });
auctionSchema.index({ endTime: 1 });
auctionSchema.index({ startTime: 1 });

const Auction = model<IAuction>("Auction", auctionSchema);

export default Auction;
