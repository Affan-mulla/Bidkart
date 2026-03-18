import { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError";

/**
 * Global error middleware.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
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
