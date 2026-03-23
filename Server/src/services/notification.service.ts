import { Types } from "mongoose";
import Notification, {
  INotificationDocument,
  NotificationType,
} from "../models/Notification.model";
import { io } from "../sockets";
import AppError from "../utils/appError";

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

interface NotificationListResult {
  notifications: INotificationDocument[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
}

/**
 * Create a user notification and emit it to the user's socket room.
 * This helper is intentionally fail-safe and never throws.
 */
export const createNotification = async (
  userId: string,
  data: CreateNotificationInput
): Promise<INotificationDocument | null> => {
  try {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    const notification = await Notification.create({
      userId: new Types.ObjectId(userId),
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || "",
      isRead: false,
    });

    io?.to(`user:${userId}`).emit("notification:new", { notification });

    return notification;
  } catch (error) {
    console.error("[notification] failed to create notification", error);
    return null;
  }
};

/**
 * Get paginated notifications and unread counters for a user.
 */
export const getNotifications = async (
  userId: string,
  page: number,
  limit: number
): Promise<NotificationListResult> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Unauthorized", 401);
  }

  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 15));
  const skip = (parsedPage - 1) * parsedLimit;
  const query = { userId: new Types.ObjectId(userId) };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false }),
  ]);

  return {
    notifications,
    total,
    page: parsedPage,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    unreadCount,
  };
};

/**
 * Mark one notification as read with ownership check.
 */
export const markOneRead = async (
  notificationId: string,
  userId: string
): Promise<INotificationDocument> => {
  if (!Types.ObjectId.isValid(notificationId) || !Types.ObjectId.isValid(userId)) {
    throw new AppError("Notification not found", 404);
  }

  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Mark all unread notifications as read for a user.
 */
export const markAllRead = async (userId: string): Promise<{ updated: number }> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Unauthorized", 401);
  }

  const result = await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } }
  );

  return {
    updated: result.modifiedCount,
  };
};

/**
 * Delete one notification with ownership check.
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  if (!Types.ObjectId.isValid(notificationId) || !Types.ObjectId.isValid(userId)) {
    throw new AppError("Notification not found", 404);
  }

  const deleted = await Notification.findOneAndDelete({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  }).select("_id");

  if (!deleted) {
    throw new AppError("Notification not found", 404);
  }
};

/**
 * Get unread notification count for a user.
 */
export const getUnreadCount = async (userId: string): Promise<{ count: number }> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Unauthorized", 401);
  }

  const count = await Notification.countDocuments({
    userId: new Types.ObjectId(userId),
    isRead: false,
  });

  return { count };
};
