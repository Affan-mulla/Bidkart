import SellerProfile from "../models/SellerProfile.model";
import User, { IUserDocument } from "../models/User.model";
import { sendOtpEmail } from "../utils/email.utils";
import AppError from "../utils/appError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils";
import { deleteOtp, generateOtp, storeOtp, verifyOtp } from "../utils/otp.utils";
import { AuthJwtPayload, AuthUserResponse } from "../types/auth";

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_LIMIT = 3;
const RESEND_WINDOW_SECONDS = 10 * 60;
export const isEmailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === "true";
const resendOtpTracker = new Map<string, { count: number; resetAtMs: number }>();

/**
 * Consume one resend attempt in the current time window.
 */
const consumeResendAttempt = (key: string): number => {
  const nowMs = Date.now();
  const existing = resendOtpTracker.get(key);

  if (!existing || existing.resetAtMs <= nowMs) {
    resendOtpTracker.set(key, {
      count: 1,
      resetAtMs: nowMs + RESEND_WINDOW_SECONDS * 1000,
    });
    return 1;
  }

  const updatedCount = existing.count + 1;
  resendOtpTracker.set(key, {
    count: updatedCount,
    resetAtMs: existing.resetAtMs,
  });

  return updatedCount;
};

interface RegisterBuyerPayload {
  name: string;
  email: string;
  password: string;
}

interface RegisterSellerPayload extends RegisterBuyerPayload {
  storeName: string;
  storeDescription: string;
}

interface VerifyEmailPayload {
  email: string;
  otp: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

interface ResendOtpPayload {
  email: string;
  type: "verify" | "reset";
}

/**
 * Build safe user object for API responses.
 */
const getSafeUser = (user: IUserDocument): AuthUserResponse => ({
  _id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar ?? null,
  isVerified: user.isVerified,
});

/**
 * Build access and refresh token pair.
 */
const buildTokens = (user: { _id: string; email: string; role: "buyer" | "seller" | "admin" }) => {
  const payload: AuthJwtPayload = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Register buyer and send email verification OTP.
 */
export const registerBuyer = async ({ name, email, password }: RegisterBuyerPayload): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  await User.create({
    name,
    email: normalizedEmail,
    password,
    role: "buyer",
    isVerified: !isEmailVerificationEnabled,
  });

  if (isEmailVerificationEnabled) {
    const otp = generateOtp();
    const otpKey = `verify:email:${normalizedEmail}`;
    await storeOtp(otpKey, otp, OTP_TTL_SECONDS);
    await sendOtpEmail(normalizedEmail, otp, "verify");
  }
};

/**
 * Register seller, create profile, and send verification OTP.
 */
export const registerSeller = async ({
  name,
  email,
  password,
  storeName,
  storeDescription,
}: RegisterSellerPayload): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: "seller",
    isVerified: !isEmailVerificationEnabled,
  });

  await SellerProfile.create({
    userId: user._id,
    storeName,
    storeDescription,
  });

  if (isEmailVerificationEnabled) {
    const otp = generateOtp();
    const otpKey = `verify:email:${normalizedEmail}`;
    await storeOtp(otpKey, otp, OTP_TTL_SECONDS);
    await sendOtpEmail(normalizedEmail, otp, "verify");
  }
};

/**
 * Verify email OTP and activate email verification status.
 */
export const verifyEmailAddress = async ({ email, otp }: VerifyEmailPayload): Promise<void> => {
  if (!isEmailVerificationEnabled) {
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const otpKey = `verify:email:${normalizedEmail}`;
  const isOtpValid = await verifyOtp(otpKey, otp);

  if (!isOtpValid) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.isVerified = true;
  await user.save();
  await deleteOtp(otpKey);
};

/**
 * Authenticate credentials and issue token pair.
 */
export const loginUser = async ({
  email,
  password,
}: LoginPayload): Promise<{ accessToken: string; refreshToken: string; user: AuthUserResponse }> => {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password +refreshToken");
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new AppError("Invalid credentials", 401);
  }

  if (isEmailVerificationEnabled && !user.isVerified) {
    throw new AppError("Please verify your email before login", 403);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }
  const { accessToken, refreshToken } = buildTokens({
    _id: String(user._id),
    email: user.email,
    role: user.role,
  });
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: getSafeUser(user),
  };
};

/**
 * Rotate refresh token and return new token pair.
 */
export const rotateRefreshToken = async (
  refreshTokenFromCookie?: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  if (!refreshTokenFromCookie) {
    throw new AppError("Refresh token missing", 401);
  }

  let decoded: AuthJwtPayload;

  try {
    decoded = verifyRefreshToken(refreshTokenFromCookie);
  } catch (_error) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (!decoded.sub) {
    throw new AppError("Invalid refresh token", 401);
  }

  const user = await User.findById(decoded.sub).select("+refreshToken");
  if (!user || user.refreshToken !== refreshTokenFromCookie) {
    throw new AppError("Invalid refresh token", 401);
  }

  const { accessToken, refreshToken } = buildTokens({
    _id: String(user._id),
    email: user.email,
    role: user.role,
  });

  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Invalidate refresh token in persistence.
 */
export const logoutUser = async (refreshTokenFromCookie?: string): Promise<void> => {
  if (!refreshTokenFromCookie) {
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshTokenFromCookie);
    if (!decoded.sub) {
      return;
    }

    const user = await User.findById(decoded.sub).select("+refreshToken");
    if (!user) {
      return;
    }

    user.refreshToken = null;
    await user.save();
  } catch (_error) {
    return;
  }
};

/**
 * Send reset OTP for existing account.
 */
export const forgotPassword = async ({ email }: ForgotPasswordPayload): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return;
  }

  const otp = generateOtp();
  const otpKey = `reset:otp:${normalizedEmail}`;
  await storeOtp(otpKey, otp, OTP_TTL_SECONDS);
  await sendOtpEmail(normalizedEmail, otp, "reset");
};

/**
 * Verify reset OTP and update password.
 */
export const resetPassword = async ({
  email,
  otp,
  newPassword,
}: ResetPasswordPayload): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const otpKey = `reset:otp:${normalizedEmail}`;
  const isOtpValid = await verifyOtp(otpKey, otp);

  if (!isOtpValid) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password +refreshToken");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();
  await deleteOtp(otpKey);
};

/**
 * Resend OTP with per-email and type rate limit.
 */
export const resendOtp = async ({ email, type }: ResendOtpPayload): Promise<void> => {
  if (!isEmailVerificationEnabled && type === "verify") {
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const rateLimitKey = `${type}:${normalizedEmail}`;
  const currentCount = consumeResendAttempt(rateLimitKey);

  if (currentCount > RESEND_LIMIT) {
    throw new AppError("Resend limit exceeded. Try again later.", 429);
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (type === "verify" && user.isVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const otp = generateOtp();
  const otpKey = type === "verify" ? `verify:email:${normalizedEmail}` : `reset:otp:${normalizedEmail}`;

  await storeOtp(otpKey, otp, OTP_TTL_SECONDS);
  await sendOtpEmail(normalizedEmail, otp, type);
};

/**
 * Fetch current user and include seller details when applicable.
 */
export const getMe = async (userId: string): Promise<AuthUserResponse> => {
  const user = await User.findById(userId).select("_id name email role avatar isVerified");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const result: AuthUserResponse = getSafeUser(user);

  if (user.role === "seller") {
    const sellerProfile = await SellerProfile.findOne({ userId: user._id }).select(
      "storeName isApproved"
    );

    result.sellerProfile = sellerProfile
      ? {
          storeName: sellerProfile.storeName,
          isApproved: sellerProfile.isApproved,
        }
      : null;
  }

  return result;
};
