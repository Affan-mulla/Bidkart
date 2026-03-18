import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect, roleGuard("buyer"));

router.get("/", getCart);
router.post("/add", addToCart);
router.patch("/update", updateCartItem);
router.delete("/remove", removeCartItem);
router.delete("/clear", clearCart);

export default router;
