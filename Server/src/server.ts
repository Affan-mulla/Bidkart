import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import connectDB from "./config/db";
import { startAuctionJobs } from "./jobs/auction.job";
import { initSocket } from "./sockets";

/**
 * Start HTTP server after required services are connected.
 */
const startServer = async () => {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;

    const httpServer = createServer(app);
    initSocket(httpServer);
    startAuctionJobs();

    httpServer.listen(port);

    httpServer.on("error", (_error) => {
      process.exit(1);
    });
  } catch {
    process.exit(1);
  }
};

startServer();
