import { Types } from "mongoose";
import Auction from "../models/Auction.model";
import Order from "../models/Order.model";
import AppError from "../utils/appError";

type RevenuePeriod = "7d" | "30d" | "90d";

interface RevenuePoint {
  _id: string;
  revenue: number;
}

const PERIOD_DAYS: Record<RevenuePeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Validate and convert id string to ObjectId.
 */
const toObjectId = (value: string, message: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }

  return new Types.ObjectId(value);
};

/**
 * Build inclusive day labels and data from aggregated revenue rows.
 */
const buildContinuousSeries = (startDate: Date, days: number, rows: RevenuePoint[]) => {
  const revenueByDay = new Map(rows.map((row) => [row._id, row.revenue]));
  const labels: string[] = [];
  const data: number[] = [];

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + dayIndex);

    const label = current.toISOString().slice(0, 10);
    labels.push(label);
    data.push(revenueByDay.get(label) || 0);
  }

  return { labels, data };
};

/**
 * Aggregate seller revenue by day for a date range.
 */
const aggregateRevenueByDay = async (sellerObjectId: Types.ObjectId, start: Date, end: Date) => {
  return Order.aggregate<RevenuePoint>([
    {
      $match: {
        status: "Delivered",
        createdAt: { $gte: start, $lt: end },
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.sellerId": sellerObjectId,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        revenue: { $sum: "$items.itemTotal" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

/**
 * Get revenue chart data, totals, and period-over-period growth.
 */
export const getRevenueData = async (sellerId: string, period: RevenuePeriod) => {
  const sellerObjectId = toObjectId(sellerId, "Invalid seller id");
  const days = PERIOD_DAYS[period];

  const endCurrent = new Date();
  const startCurrent = new Date(endCurrent);
  startCurrent.setHours(0, 0, 0, 0);
  startCurrent.setDate(startCurrent.getDate() - (days - 1));

  const startPrevious = new Date(startCurrent);
  startPrevious.setDate(startPrevious.getDate() - days);

  const [currentRows, previousRows] = await Promise.all([
    aggregateRevenueByDay(sellerObjectId, startCurrent, endCurrent),
    aggregateRevenueByDay(sellerObjectId, startPrevious, startCurrent),
  ]);

  const { labels, data } = buildContinuousSeries(startCurrent, days, currentRows);

  const total = Number(data.reduce((sum, value) => sum + value, 0).toFixed(2));
  const previousTotal = Number(
    previousRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0).toFixed(2)
  );

  let growth = 0;
  if (previousTotal > 0) {
    growth = Number((((total - previousTotal) / previousTotal) * 100).toFixed(2));
  } else if (total > 0) {
    growth = 100;
  }

  return {
    labels,
    data,
    total,
    growth,
  };
};

/**
 * Get seller order counts by status and fulfillment rate.
 */
export const getOrderSummary = async (sellerId: string) => {
  const sellerObjectId = toObjectId(sellerId, "Invalid seller id");

  const rows = await Order.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        "items.sellerId": sellerObjectId,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    Placed: 0,
    Confirmed: 0,
    Packed: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };

  rows.forEach((row) => {
    if (row._id in summary) {
      summary[row._id as keyof typeof summary] = row.count;
    }
  });

  const totalOrders = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const fulfillmentRate =
    totalOrders > 0 ? Number(((summary.Delivered / totalOrders) * 100).toFixed(2)) : 0;

  return {
    ...summary,
    totalOrders,
    fulfillmentRate,
  };
};

/**
 * Get top selling products for a seller based on order items.
 */
export const getTopProducts = async (sellerId: string, limit = 5) => {
  const sellerObjectId = toObjectId(sellerId, "Invalid seller id");
  const parsedLimit = Math.max(1, Math.min(20, Number(limit) || 5));

  return Order.aggregate<{
    productId: Types.ObjectId;
    title: string;
    image: string;
    totalRevenue: number;
    totalUnitsSold: number;
    ordersCount: number;
  }>([
    { $unwind: "$items" },
    {
      $match: {
        "items.sellerId": sellerObjectId,
      },
    },
    {
      $group: {
        _id: "$items.productId",
        title: { $first: "$items.title" },
        image: { $first: "$items.image" },
        totalRevenue: { $sum: "$items.itemTotal" },
        totalUnitsSold: { $sum: "$items.quantity" },
        orderIds: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        title: 1,
        image: 1,
        totalRevenue: 1,
        totalUnitsSold: 1,
        ordersCount: { $size: "$orderIds" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: parsedLimit },
  ]);
};

/**
 * Get seller auction performance metrics.
 */
export const getAuctionPerformance = async (sellerId: string) => {
  const sellerObjectId = toObjectId(sellerId, "Invalid seller id");

  const rows = await Auction.aggregate<{
    totalAuctions: number;
    liveAuctions: number;
    completedAuctions: number;
    soldAuctions: number;
    endedOrSoldAuctions: number;
    totalBids: number;
    highestSale: number;
  }>([
    {
      $match: {
        sellerId: sellerObjectId,
      },
    },
    {
      $group: {
        _id: null,
        totalAuctions: { $sum: 1 },
        liveAuctions: {
          $sum: {
            $cond: [{ $eq: ["$status", "live"] }, 1, 0],
          },
        },
        completedAuctions: {
          $sum: {
            $cond: [{ $in: ["$status", ["ended", "sold"]] }, 1, 0],
          },
        },
        soldAuctions: {
          $sum: {
            $cond: [{ $eq: ["$status", "sold"] }, 1, 0],
          },
        },
        endedOrSoldAuctions: {
          $sum: {
            $cond: [{ $in: ["$status", ["ended", "sold"]] }, 1, 0],
          },
        },
        totalBids: {
          $sum: "$bidCount",
        },
        highestSale: {
          $max: {
            $cond: [{ $eq: ["$status", "sold"] }, "$currentBid", 0],
          },
        },
      },
    },
  ]);

  const base = rows[0] || {
    totalAuctions: 0,
    liveAuctions: 0,
    completedAuctions: 0,
    soldAuctions: 0,
    endedOrSoldAuctions: 0,
    totalBids: 0,
    highestSale: 0,
  };

  const avgBidsPerAuction =
    base.totalAuctions > 0 ? Number((base.totalBids / base.totalAuctions).toFixed(2)) : 0;
  const wonRate =
    base.endedOrSoldAuctions > 0
      ? Number(((base.soldAuctions / base.endedOrSoldAuctions) * 100).toFixed(2))
      : 0;

  return {
    totalAuctions: base.totalAuctions,
    liveAuctions: base.liveAuctions,
    completedAuctions: base.completedAuctions,
    totalBids: base.totalBids,
    avgBidsPerAuction,
    highestSale: base.highestSale,
    wonRate,
  };
};
