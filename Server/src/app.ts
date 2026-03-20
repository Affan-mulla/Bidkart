import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import auctionRoutes from "./routes/auction.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import productRoutes from "./routes/product.routes";
import reviewRoutes from "./routes/review.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import AppError from "./utils/appError";
import { sendSuccess } from "./utils/response.utils";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth requests. Please try again later.",
    errors: [],
  },
});

app.get("/api/health", (_req, res) => {
  return sendSuccess(res, "BidKart server is running", { ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use((req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

app.use(errorHandler);

export default app;
