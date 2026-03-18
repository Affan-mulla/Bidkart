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

    const server = app.listen(port, () => {
      console.log(`[Server] listening on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      console.error("[Server] listen failed", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("[Server] startup failed", error);
    process.exit(1);
  }
};

startServer();
