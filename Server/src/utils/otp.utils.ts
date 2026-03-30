import User from "../models/User.model";
import crypto from "crypto";

type OtpContext = {
  email: string;
  type: "verify" | "reset";
};

/**
 * Convert OTP to deterministic hash before persistence.
 */
const hashOtp = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/**
 * Parse OTP key into email and flow type.
 */
const parseOtpKey = (key: string): OtpContext => {
  if (key.startsWith("verify:email:")) {
    return {
      type: "verify",
      email: key.replace("verify:email:", ""),
    };
  }

  if (key.startsWith("reset:otp:")) {
    return {
      type: "reset",
      email: key.replace("reset:otp:", ""),
    };
  }

  throw new Error("Unsupported OTP key format");
};

/**
 * Generate a 6-digit OTP string.
 */
export const generateOtp = (): string => {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
};

/**
 * Store OTP in MongoDB user fields with expiry.
 */
export const storeOtp = async (key: string, otp: string, ttlSeconds: number): Promise<void> => {
  const { email, type } = parseOtpKey(key);
  const user = await User.findOne({ email }).select(
    "+emailVerificationOtp +emailVerificationOtpExpiry +passwordResetOtp +passwordResetOtpExpiry"
  );

  if (!user) {
    return;
  }

  const expiry = new Date(Date.now() + ttlSeconds * 1000);
  const hashedOtp = hashOtp(otp);

  if (type === "verify") {
    user.emailVerificationOtp = hashedOtp;
    user.emailVerificationOtpExpiry = expiry;
  } else {
    user.passwordResetOtp = hashedOtp;
    user.passwordResetOtpExpiry = expiry;
  }

  await user.save();
};

/**
 * Compare provided OTP against MongoDB user fields.
 */
export const verifyOtp = async (key: string, otp: string): Promise<boolean> => {
  const { email, type } = parseOtpKey(key);
  const user = await User.findOne({ email }).select(
    "+emailVerificationOtp +emailVerificationOtpExpiry +passwordResetOtp +passwordResetOtpExpiry"
  );

  if (!user) {
    return false;
  }

  const now = new Date();
  const storedOtp = type === "verify" ? user.emailVerificationOtp : user.passwordResetOtp;
  const storedExpiry =
    type === "verify" ? user.emailVerificationOtpExpiry : user.passwordResetOtpExpiry;

  if (!storedOtp || !storedExpiry) {
    return false;
  }

  if (storedExpiry.getTime() <= now.getTime()) {
    await deleteOtp(key);
    return false;
  }

  const storedOtpBuffer = Buffer.from(storedOtp, "utf-8");
  const providedOtpBuffer = Buffer.from(hashOtp(otp), "utf-8");

  if (storedOtpBuffer.length !== providedOtpBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedOtpBuffer, providedOtpBuffer);
};

/**
 * Clear OTP and expiry fields from MongoDB.
 */
export const deleteOtp = async (key: string): Promise<void> => {
  const { email, type } = parseOtpKey(key);
  const user = await User.findOne({ email }).select(
    "+emailVerificationOtp +emailVerificationOtpExpiry +passwordResetOtp +passwordResetOtpExpiry"
  );

  if (!user) {
    return;
  }

  if (type === "verify") {
    user.emailVerificationOtp = null;
    user.emailVerificationOtpExpiry = null;
  } else {
    user.passwordResetOtp = null;
    user.passwordResetOtpExpiry = null;
  }

  await user.save();
};
