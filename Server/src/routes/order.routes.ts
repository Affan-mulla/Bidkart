import express from "express";
import {
  cancelOrder,
  getBuyerOrderById,
  getBuyerOrders,
  getSellerOrderById,
  getSellerOrders,
  placeOrder,
  updateOrderStatus,
} from "../controllers/order.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", protect, roleGuard("buyer"), placeOrder);
router.get("/", protect, roleGuard("buyer"), getBuyerOrders);
router.patch("/:id/cancel", protect, roleGuard("buyer"), cancelOrder);
router.get("/seller", protect, roleGuard("seller"), getSellerOrders);
router.get("/seller/:id", protect, roleGuard("seller"), getSellerOrderById);
router.patch("/seller/:id/status", protect, roleGuard("seller"), updateOrderStatus);
router.get("/:id", protect, roleGuard("buyer"), getBuyerOrderById);

export default router;
