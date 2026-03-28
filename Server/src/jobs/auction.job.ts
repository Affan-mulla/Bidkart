import cron from "node-cron";
import {
  cancelExpiredAuctionOrders,
  endExpiredAuctions,
  startScheduledAuctions,
} from "../services/auction.service";
import { io } from "../sockets";

/**
 * Schedule recurring auction lifecycle jobs.
 */
export const startAuctionJobs = () => {
  void io;

  cron.schedule("*/30 * * * * *", async () => {
    await startScheduledAuctions();
    await endExpiredAuctions();
  });

  cron.schedule("*/5 * * * *", async () => {
    await cancelExpiredAuctionOrders();
  });
};
