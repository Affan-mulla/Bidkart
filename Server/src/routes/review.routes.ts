import express from "express";
import {
  addSellerReply,
  createReview,
  deleteReview,
  getProductReviews,
  toggleHelpful,
} from "../controllers/review.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";
import { reviewSchemas, validateBody } from "../middleware/validate.middleware";

const router = express.Router();

router.post("/", protect, roleGuard("buyer"), validateBody(reviewSchemas.createReview), createReview);
router.get("/product/:productId", getProductReviews);
router.patch(
  "/:id/reply",
  protect,
  roleGuard("seller"),
  validateBody(reviewSchemas.sellerReply),
  addSellerReply
);
router.post("/:id/helpful", protect, toggleHelpful);
router.delete("/:id", protect, roleGuard("buyer"), deleteReview);

export default router;
