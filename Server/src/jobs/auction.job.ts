import cron from "node-cron";
import { endExpiredAuctions, startScheduledAuctions } from "../services/auction.service";
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
};
