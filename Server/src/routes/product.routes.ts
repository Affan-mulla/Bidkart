import express from "express";
import { searchProducts } from "../controllers/product.controller";

const router = express.Router();

router.get("/search", searchProducts);

export default router;
