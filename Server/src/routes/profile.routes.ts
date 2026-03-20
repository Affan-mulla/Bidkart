import express from "express";
import * as profileController from "../controllers/profile.controller";
import { protect } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";
import { profileSchemas, validateBody } from "../middleware/validate.middleware";

const router = express.Router();

router.get("/profile", protect, profileController.getProfile);
router.patch(
  "/profile",
  protect,
  validateBody(profileSchemas.updateProfile),
  profileController.updateProfile
);
router.post("/avatar", protect, uploadAvatar, profileController.uploadAvatar);

router.get("/addresses", protect, profileController.getAddresses);
router.post(
  "/addresses",
  protect,
  validateBody(profileSchemas.address),
  profileController.addAddress
);
router.patch(
  "/addresses/:id",
  protect,
  validateBody(profileSchemas.address.partial()),
  profileController.updateAddress
);
router.delete("/addresses/:id", protect, profileController.deleteAddress);
router.patch("/addresses/:id/default", protect, profileController.setDefaultAddress);

export default router;
