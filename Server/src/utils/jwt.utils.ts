import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthJwtPayload } from "../types/auth";

/**
 * Generate access token valid for 15 minutes.
 */
export const generateAccessToken = (payload: AuthJwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(payload, secret, { expiresIn: "15m" });
};

/**
 * Generate refresh token valid for 7 days.
 */
export const generateRefreshToken = (payload: AuthJwtPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

/**
 * Verify access token.
 */
export const verifyAccessToken = (token: string): AuthJwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.verify(token, secret) as JwtPayload as AuthJwtPayload;
};

/**
 * Verify refresh token.
 */
export const verifyRefreshToken = (token: string): AuthJwtPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return jwt.verify(token, secret) as JwtPayload as AuthJwtPayload;
};
