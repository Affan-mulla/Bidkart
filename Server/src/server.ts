import "dotenv/config";
import app from "./app";
import connectDB from "./config/db";

/**
 * Start HTTP server after required services are connected.
 */
const startServer = async () => {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;

    const server = app.listen(port);

    server.on("error", (_error) => {
      process.exit(1);
    });
  } catch {
    process.exit(1);
  }
};

startServer();
