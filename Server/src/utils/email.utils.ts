import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Build OTP HTML template by email type.
 */
const buildOtpTemplate = (otp: string, type: "verify" | "reset"): string => {
  const title = type === "verify" ? "Verify your email" : "Reset your password";
  const subtitle =
    type === "verify"
      ? "Use this OTP to complete your BidKart account verification."
      : "Use this OTP to reset your BidKart account password.";

  return `
    <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #e7ecf4;">
        <h1 style="margin: 0; color: #0b1f44; font-size: 24px;">BidKart</h1>
        <h2 style="margin: 14px 0 8px; color: #102a56; font-size: 20px;">${title}</h2>
        <p style="margin: 0 0 20px; color: #4a5e80; font-size: 14px; line-height: 1.6;">${subtitle}</p>
        <div style="background: #f0f4ff; border: 1px dashed #6f8ad9; border-radius: 10px; text-align: center; padding: 18px; margin: 12px 0 16px;">
          <span style="font-size: 34px; letter-spacing: 8px; color: #0b1f44; font-weight: 700;">${otp}</span>
        </div>
        <p style="margin: 0; color: #5d6f8f; font-size: 13px;">This OTP expires in 10 minutes.</p>
      </div>
    </div>
  `;
};

/**
 * Send OTP email for verification or reset flow.
 */
export const sendOtpEmail = async (
  to: string,
  otp: string,
  type: "verify" | "reset"
): Promise<void> => {
  const subject =
    type === "verify" ? "BidKart Email Verification OTP" : "BidKart Password Reset OTP";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: buildOtpTemplate(otp, type),
  });
};
