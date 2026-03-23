import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as notificationService from "../services/notification.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Normalize route param to a plain string.
 */
const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

/**
 * Fetch authenticated user's notifications.
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const result = await notificationService.getNotifications(String(authUser._id), page, limit);

    return sendSuccess(res, "Notifications fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Mark one notification as read.
 */
export const markOneRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const notificationId = getParamId(req.params.id);
    const notification = await notificationService.markOneRead(
      notificationId,
      String(authUser._id)
    );

    return sendSuccess(res, "Notification marked as read", { notification });
  } catch (error) {
    return next(error);
  }
};

/**
 * Mark all notifications as read.
 */
export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationService.markAllRead(String(authUser._id));

    return sendSuccess(res, "All notifications marked as read", { ...result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete one notification.
 */
export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const notificationId = getParamId(req.params.id);
    await notificationService.deleteNotification(notificationId, String(authUser._id));

    return sendSuccess(res, "Notification deleted", {});
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch unread count for authenticated user.
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationService.getUnreadCount(String(authUser._id));

    return sendSuccess(res, "Unread count fetched", { ...result });
  } catch (error) {
    return next(error);
  }
};
