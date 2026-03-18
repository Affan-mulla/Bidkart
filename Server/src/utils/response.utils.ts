import { Response } from "express";

/**
 * Send standardized success response.
 * @param res Express response.
 * @param message Response message.
 * @param data Optional response data.
 * @param statusCode HTTP status code.
 */
export const sendSuccess = (
  res: Response,
  message: string,
  data: Record<string, unknown> = {},
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};
