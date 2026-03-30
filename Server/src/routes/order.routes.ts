import express from "express";
import {
  cancelOrder,
  confirmFakePayment,
  downloadInvoiceHandler,
  exportSellerOrders,
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
router.post("/:id/fake-confirm", protect, roleGuard("buyer"), confirmFakePayment);
router.get("/seller/export", protect, roleGuard("seller"), exportSellerOrders);
router.get("/seller", protect, roleGuard("seller"), getSellerOrders);
router.get("/seller/:id", protect, roleGuard("seller"), getSellerOrderById);
router.patch("/seller/:id/status", protect, roleGuard("seller"), updateOrderStatus);
router.get("/:id/invoice", protect, roleGuard("buyer"), downloadInvoiceHandler);
router.get("/:id", protect, roleGuard("buyer"), getBuyerOrderById);

export default router;
