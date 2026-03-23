import express from "express";
import { applyCouponHandler, validateCouponHandler } from "../controllers/coupon.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";
import { couponSchemas, validateBody } from "../middleware/validate.middleware";

const router = express.Router();

router.post(
  "/validate",
  protect,
  roleGuard("buyer"),
  validateBody(couponSchemas.validateCoupon),
  validateCouponHandler
);
router.post(
  "/apply",
  protect,
  roleGuard("buyer"),
  validateBody(couponSchemas.applyCoupon),
  applyCouponHandler
);

export default router;
