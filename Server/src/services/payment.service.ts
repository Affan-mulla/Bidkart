import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.model";
import { getNextInvoiceNumber } from "../models/Counter.model";
import AppError from "../utils/appError";
import { createNotification } from "./notification.service";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

interface RazorpayCapturedEvent {
  event: "payment.captured";
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}

interface RazorpayRefundEvent {
  event: "refund.created";
  payload?: {
    refund?: {
      entity?: {
        payment_id?: string;
      };
    };
  };
}

type RazorpayWebhookEvent = RazorpayCapturedEvent | RazorpayRefundEvent | { event: string };

const isCapturedEvent = (eventPayload: RazorpayWebhookEvent): eventPayload is RazorpayCapturedEvent => {
  return eventPayload.event === "payment.captured";
};

const isRefundEvent = (eventPayload: RazorpayWebhookEvent): eventPayload is RazorpayRefundEvent => {
  return eventPayload.event === "refund.created";
};

/**
 * Generate stable-looking fake Razorpay identifiers for local/demo checkout.
 */
const generateFakeRazorpayIds = (orderId: string) => {
  const suffix = orderId.slice(-8).toUpperCase();
  const randomHex = crypto.randomBytes(6).toString("hex");

  return {
    razorpayOrderId: `order_demo_${suffix}_${randomHex}`,
    razorpayPaymentId: `pay_demo_${suffix}_${randomHex}`,
    razorpaySignature: `sig_demo_${crypto.randomBytes(12).toString("hex")}`,
  };
};

/**
 * Create Razorpay order for a BidKart order.
 */
export async function createRazorpayOrder(
  orderId: string,
  amountInRupees: number
): Promise<{ razorpayOrderId: string; amount: number; currency: string; keyId: string }> {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new AppError("Razorpay is not configured", 500);
  }

  const amountInPaise = Math.round(amountInRupees * 100);
  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: orderId,
  });

  await Order.findByIdAndUpdate(orderId, {
    razorpayOrderId: razorpayOrder.id,
  });

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: "INR",
    keyId: razorpayKeyId,
  };
}

/**
 * Verify Razorpay payment signature.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): void {
  if (!razorpayKeySecret) {
    throw new AppError("Razorpay is not configured", 500);
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new AppError("Invalid payment signature", 400);
  }
}

/**
 * Mark order paid after successful signature verification.
 */
export async function markOrderPaid(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<void> {
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.paymentStatus === "Paid") {
    throw new AppError("Order already paid", 400);
  }

  const invoiceNumber = await getNextInvoiceNumber();

  order.paymentStatus = "Paid";
  order.paymentMethod = "Razorpay";
  order.razorpayOrderId = razorpayOrderId;
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  order.invoiceNumber = invoiceNumber;

  await order.save();

  await createNotification(String(order.buyerId), {
    type: "payment_received",
    title: "Payment Confirmed",
    message: `Payment of ₹${order.totalAmount.toLocaleString("en-IN")} received for order #${invoiceNumber}.`,
    link: `/orders/${String(order._id)}`,
  });
}

/**
 * Confirm Razorpay payment in demo mode without external gateway verification.
 */
export async function confirmFakeRazorpayPayment(orderId: string): Promise<void> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.paymentMethod !== "Razorpay") {
    throw new AppError("This order is not using Razorpay", 400);
  }

  if (order.paymentStatus === "Paid") {
    throw new AppError("Order already paid", 400);
  }

  const invoiceNumber = await getNextInvoiceNumber();
  const fakePayment = generateFakeRazorpayIds(String(order._id));

  order.paymentStatus = "Paid";
  order.razorpayOrderId = fakePayment.razorpayOrderId;
  order.razorpayPaymentId = fakePayment.razorpayPaymentId;
  order.razorpaySignature = fakePayment.razorpaySignature;
  order.invoiceNumber = invoiceNumber;

  await order.save();

  await createNotification(String(order.buyerId), {
    type: "payment_received",
    title: "Payment Confirmed",
    message: `Payment of ₹${order.totalAmount.toLocaleString("en-IN")} received for order #${invoiceNumber}.`,
    link: `/orders/${String(order._id)}`,
  });
}

/**
 * Handle verified Razorpay webhook events.
 */
export async function handleWebhookEvent(body: Buffer, signature: string): Promise<void> {
  if (!razorpayWebhookSecret) {
    throw new AppError("Razorpay webhook is not configured", 500);
  }

  const expectedSignature = crypto
    .createHmac("sha256", razorpayWebhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const eventPayload = JSON.parse(body.toString()) as RazorpayWebhookEvent;

  if (isCapturedEvent(eventPayload)) {
    const razorpayOrderId = eventPayload.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = eventPayload.payload?.payment?.entity?.id;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return;
    }

    const order = await Order.findOne({ razorpayOrderId });

    if (!order || order.paymentStatus === "Paid") {
      return;
    }

    if (!order.razorpaySignature) {
      return;
    }

    await markOrderPaid(
      String(order._id),
      razorpayOrderId,
      razorpayPaymentId,
      order.razorpaySignature
    );
    return;
  }

  if (isRefundEvent(eventPayload)) {
    const razorpayPaymentId = eventPayload.payload?.refund?.entity?.payment_id;

    if (!razorpayPaymentId) {
      return;
    }

    await Order.findOneAndUpdate(
      { razorpayPaymentId },
      {
        paymentStatus: "Refunded",
      }
    );
  }
}
