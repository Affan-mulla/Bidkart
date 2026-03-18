import User from "../models/User.model";

type OtpContext = {
  email: string;
  type: "verify" | "reset";
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
  const user = await User.findOne({ email });

  if (!user) {
    return;
  }

  const expiry = new Date(Date.now() + ttlSeconds * 1000);

  if (type === "verify") {
    user.emailVerificationOtp = otp;
    user.emailVerificationOtpExpiry = expiry;
  } else {
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiry = expiry;
  }

  await user.save();
};

/**
 * Compare provided OTP against MongoDB user fields.
 */
export const verifyOtp = async (key: string, otp: string): Promise<boolean> => {
  const { email, type } = parseOtpKey(key);
  const user = await User.findOne({ email });

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
    return false;
  }

  return storedOtp === otp;
};

/**
 * Clear OTP and expiry fields from MongoDB.
 */
export const deleteOtp = async (key: string): Promise<void> => {
  const { email, type } = parseOtpKey(key);
  const user = await User.findOne({ email });

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
