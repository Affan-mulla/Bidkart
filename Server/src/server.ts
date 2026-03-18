import dotenv from "dotenv";
import app from "./app";
import connectDB from "./config/db";


dotenv.config();

/**
 * Start HTTP server after required services are connected.
 */
const startServer = async () => {
  try {
    await connectDB();
    
    const port = Number(process.env.PORT) || 5000;

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
