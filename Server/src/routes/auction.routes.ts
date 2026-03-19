import express from "express";
import {
  buyItNow,
  cancelAuction,
  createAuction,
  getAuctionById,
  getAuctions,
  getMyAuctions,
  placeBidHttp,
  toggleWatch,
  updateAuction,
} from "../controllers/auction.controller";
import { protect, roleGuard } from "../middleware/auth.middleware";
import { auctionSchemas, validateBody } from "../middleware/validate.middleware";

const router = express.Router();

router.get("/", getAuctions);
router.get("/seller/mine", protect, roleGuard("seller"), getMyAuctions);
router.get("/:id", getAuctionById);
router.post("/", protect, roleGuard("seller"), validateBody(auctionSchemas.createAuction), createAuction);
router.put("/:id", protect, roleGuard("seller"), updateAuction);
router.delete("/:id", protect, roleGuard("seller"), cancelAuction);
router.post("/:id/bid", protect, roleGuard("buyer"), validateBody(auctionSchemas.placeBid), placeBidHttp);
router.post("/:id/watch", protect, roleGuard("buyer"), toggleWatch);
router.post("/:id/buy-now", protect, roleGuard("buyer"), buyItNow);

export default router;
