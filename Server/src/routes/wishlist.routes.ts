import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", protect, roleGuard("buyer"), getWishlist);
router.post("/add", protect, roleGuard("buyer"), addToWishlist);
router.delete("/remove", protect, roleGuard("buyer"), removeFromWishlist);

export default router;
