import { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError";

/**
 * Global error middleware.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isDebugEnabled = process.env.NODE_ENV !== "production" || process.env.DEBUG_ERRORS === "true";

  if (isDebugEnabled) {
    console.error("[ErrorMiddleware] request failed", {
      method: req.method,
      originalUrl: req.originalUrl,
      message: err.message,
      stack: err.stack,
      isAppError: err instanceof AppError,
    });
  }

  if (!(err instanceof AppError)) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [],
    });
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors || [],
  });
};
