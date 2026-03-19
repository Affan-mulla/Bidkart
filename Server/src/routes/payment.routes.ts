import express from "express";
import { protect, roleGuard } from "../middleware/auth.middleware";
import {
  createRazorpayOrderHandler,
  verifyPaymentHandler,
  webhookHandler,
} from "../controllers/payment.controller";

const router = express.Router();

router.post("/webhook", webhookHandler);
router.post("/create-order", protect, roleGuard("buyer"), createRazorpayOrderHandler);
router.post("/verify", protect, roleGuard("buyer"), verifyPaymentHandler);

export default router;
