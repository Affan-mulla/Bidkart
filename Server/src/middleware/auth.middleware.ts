import { NextFunction, Request, Response } from "express";
import User, { IUserDocument } from "../models/User.model";
import AppError from "../utils/appError";
import { verifyAccessToken } from "../utils/jwt.utils";

/**
 * Verify access token and attach authenticated user to request.
 */
export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return next(new AppError("Unauthorized", 401));
    }

    const token = authorizationHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded.sub) {
      return next(new AppError("Invalid token", 401));
    }

    const user = await User.findById(decoded.sub).select(
      "_id name email role avatar isVerified isActive"
    );

    if (!user || !user.isActive) {
      return next(new AppError("User not found or inactive", 401));
    }

    req.user = user;
    return next();
  } catch (_error) {
    return next(new AppError("Unauthorized", 401));
  }
};

/**
 * Restrict route access to one or more roles.
 */
export const roleGuard = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!allowedRoles.includes(authUser.role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
};
