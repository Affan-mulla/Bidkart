import express from "express";
import * as authController from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { authSchemas, validateBody } from "../middleware/validate.middleware";

const router = express.Router();

router.post("/register", validateBody(authSchemas.registerBuyer), authController.registerBuyer);
router.post("/register/seller", validateBody(authSchemas.registerSeller), authController.registerSeller);
router.post("/verify-email", validateBody(authSchemas.verifyEmail), authController.verifyEmail);
router.post("/login", validateBody(authSchemas.login), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password",
  validateBody(authSchemas.forgotPassword),
  authController.forgotPassword
);
router.post("/reset-password", validateBody(authSchemas.resetPassword), authController.resetPassword);
router.post("/resend-otp", validateBody(authSchemas.resendOtp), authController.resendOtp);

router.get("/me", protect, authController.me);

export default router;
