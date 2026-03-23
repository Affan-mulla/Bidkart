import express from "express";
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "../controllers/notification.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.patch("/read-all", protect, markAllRead);
router.patch("/:id/read", protect, markOneRead);
router.delete("/:id", protect, deleteNotification);

export default router;
