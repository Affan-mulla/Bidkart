import { CookieOptions, NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as authService from "../services/auth.service";
import { sendSuccess } from "../utils/response.utils";
import AppError from "../utils/appError";

/**
 * Build secure refresh-token cookie options.
 */
const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

/**
 * Register buyer account.
 */
export const registerBuyer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.registerBuyer(req.body);

    if (!authService.isEmailVerificationEnabled) {
      return sendSuccess(res, "Account created successfully");
    }

    return sendSuccess(res, "Verification OTP sent to email");
  } catch (error) {
    return next(error);
  }
};

/**
 * Register seller account.
 */
export const registerSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.registerSeller(req.body);

    if (!authService.isEmailVerificationEnabled) {
      return sendSuccess(res, "Seller account created successfully");
    }

    return sendSuccess(res, "Seller account created. Verify your email.");
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify user email using OTP.
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.verifyEmailAddress(req.body);

    if (!authService.isEmailVerificationEnabled) {
      return sendSuccess(res, "Email verification is currently disabled");
    }

    return sendSuccess(res, "Email verified successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * Login user and set refresh cookie.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken, refreshToken, user } = await authService.loginUser(req.body);
    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
    return sendSuccess(res, "Login successful", { accessToken, user });
  } catch (error) {
    return next(error);
  }
};

/**
 * Rotate refresh token and issue new access token.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenFromCookie = req.cookies.refreshToken as string | undefined;
    console.log("Refresh token from cookie:", tokenFromCookie);

    if (!tokenFromCookie) {
      return next(new AppError("No refresh token provided", 401));
    }
    const { accessToken, refreshToken: rotatedRefreshToken } = await authService.rotateRefreshToken(
      tokenFromCookie
    );

    res.cookie("refreshToken", rotatedRefreshToken, getRefreshCookieOptions());
    return sendSuccess(res, "Token refreshed", { accessToken });
  } catch (error) {
    return next(error);
  }
};

/**
 * Logout and clear refresh token.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logoutUser(req.cookies?.refreshToken as string | undefined);
    res.clearCookie("refreshToken", getRefreshCookieOptions());
    return sendSuccess(res, "Logged out");
  } catch (error) {
    return next(error);
  }
};

/**
 * Start forgot password flow.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.forgotPassword(req.body);
    return sendSuccess(res, "Password reset OTP sent");
  } catch (error) {
    return next(error);
  }
};

/**
 * Complete reset password flow.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPassword(req.body);
    return sendSuccess(res, "Password reset successful");
  } catch (error) {
    return next(error);
  }
};

/**
 * Resend OTP by flow type.
 */
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resendOtp(req.body);
    return sendSuccess(res, "OTP resent successfully");
  } catch (error) {
    return next(error);
  }
};

/**
 * Return current authenticated user.
 */
export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user as IUserDocument | undefined;

    if (!authUser) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await authService.getMe(String(authUser._id));
    return sendSuccess(res, "Current user fetched", { user });
  } catch (error) {
    return next(error);
  }
};
