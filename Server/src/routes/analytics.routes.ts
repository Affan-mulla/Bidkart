import express from "express";
import {
  getAuctionPerformance,
  getOrderSummary,
  getRevenue,
  getTopProducts,
} from "../controllers/analytics.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/revenue", protect, roleGuard("seller"), getRevenue);
router.get("/order-summary", protect, roleGuard("seller"), getOrderSummary);
router.get("/top-products", protect, roleGuard("seller"), getTopProducts);
router.get("/auction-perf", protect, roleGuard("seller"), getAuctionPerformance);

export default router;
