import axiosInstance from "@/api/axiosInstance";

export interface CreateRazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

/**
 * Requests backend to create Razorpay order for a BidKart order.
 */
export async function createRazorpayOrder(
  orderId: string,
): Promise<CreateRazorpayOrderResponse> {
  const res = await axiosInstance.post<ApiEnvelope<CreateRazorpayOrderResponse>>(
    "/payments/create-order",
    { orderId },
  );

  return res.data.data;
}

/**
 * Verifies Razorpay signature and updates payment status server-side.
 */
export async function verifyPayment(payload: VerifyPaymentPayload): Promise<void> {
  await axiosInstance.post("/payments/verify", payload);
}
