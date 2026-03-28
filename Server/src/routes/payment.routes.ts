import express from "express";
import { protect, roleGuard } from "../middleware/auth.middleware";
import {
  createRazorpayOrderHandler,
  fakeConfirmPaymentHandler,
  verifyPaymentHandler,
  webhookHandler,
} from "../controllers/payment.controller";

const router = express.Router();

router.post("/webhook", webhookHandler);
router.post("/create-order", protect, roleGuard("buyer"), createRazorpayOrderHandler);
router.post("/verify", protect, roleGuard("buyer"), verifyPaymentHandler);
router.post("/fake-confirm", protect, roleGuard("buyer"), fakeConfirmPaymentHandler);

export default router;
