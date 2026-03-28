import express from "express";
import {
	createProduct,
	deleteProduct,
	exportSellerProducts,
	getProductDetail,
	getMonthlyMostSoldProducts,
	getProducts,
	getMyProducts,
	getSellerStats,
	searchProducts,
	updateProduct,
} from "../controllers/product.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";
import { uploadProductImages } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/search", searchProducts);
router.get("/seller/stats", protect, roleGuard("seller"), getSellerStats);
router.get("/seller/export", protect, roleGuard("seller"), exportSellerProducts);
router.get("/seller/mine", protect, roleGuard("seller"), getMyProducts);
router.get("/most-sold-monthly", getMonthlyMostSoldProducts);
router.get("/", getProducts);
router.post("/", protect, roleGuard("seller"), uploadProductImages, createProduct);
router.get("/:id", getProductDetail);
router.put("/:id", protect, roleGuard("seller"), uploadProductImages, updateProduct);
router.delete("/:id", protect, roleGuard("seller"), deleteProduct);

export default router;
