import { NextFunction, Request, Response } from "express";
import User, { IUserDocument } from "../models/User.model";
import AppError from "../utils/appError";
import { verifyAccessToken } from "../utils/jwt.utils";

const isProductCreateDebugEnabled =
  process.env.DEBUG_PRODUCT_CREATE === "true" || process.env.NODE_ENV !== "production";

/**
 * Detect product create route for scoped debug logs.
 */
const isProductCreateRequest = (req: Request): boolean => {
  return req.method === "POST" && req.baseUrl === "/api/products" && req.path === "/";
};

/**
 * Write scoped debug logs for product-create auth pipeline.
 */
const logProductCreateDebug = (message: string, meta: Record<string, unknown> = {}) => {
  if (!isProductCreateDebugEnabled) {
    return;
  }

  console.debug(`[ProductCreate] ${message}`, meta);
};

/**
 * Verify access token and attach authenticated user to request.
 */
export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (isProductCreateRequest(req)) {
      logProductCreateDebug("protect start", {
        method: req.method,
        originalUrl: req.originalUrl,
      });
    }

    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      if (isProductCreateRequest(req)) {
        logProductCreateDebug("protect failed - missing bearer token");
      }
      return next(new AppError("Unauthorized", 401));
    }

    const token = authorizationHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded.sub) {
      if (isProductCreateRequest(req)) {
        logProductCreateDebug("protect failed - decoded token has no subject");
      }
      return next(new AppError("Invalid token", 401));
    }

    const user = await User.findById(decoded.sub).select(
      "_id name email role avatar isVerified isActive"
    );

    if (!user || !user.isActive) {
      if (isProductCreateRequest(req)) {
        logProductCreateDebug("protect failed - user not found or inactive", {
          userId: decoded.sub,
        });
      }
      return next(new AppError("User not found or inactive", 401));
    }

    req.user = user;
    if (isProductCreateRequest(req)) {
      logProductCreateDebug("protect success", {
        userId: String(user._id),
        role: user.role,
      });
    }
    return next();
  } catch (_error) {
    if (isProductCreateRequest(req)) {
      logProductCreateDebug("protect failed - token verification error");
    }
    return next(new AppError("Unauthorized", 401));
  }
};

/**
 * Restrict route access to one or more roles.
 */
export const roleGuard = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const shouldLog = isProductCreateRequest(req);
    if (shouldLog) {
      logProductCreateDebug("roleGuard start", {
        allowedRoles,
      });
    }

    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      if (shouldLog) {
        logProductCreateDebug("roleGuard failed - no req.user present");
      }
      return next(new AppError("Unauthorized", 401));
    }

    if (!allowedRoles.includes(authUser.role)) {
      if (shouldLog) {
        logProductCreateDebug("roleGuard failed - role not allowed", {
          userId: String(authUser._id),
          userRole: authUser.role,
        });
      }
      return next(new AppError("Forbidden", 403));
    }

    if (shouldLog) {
      logProductCreateDebug("roleGuard success", {
        userId: String(authUser._id),
        userRole: authUser.role,
      });
    }

    return next();
  };
};
