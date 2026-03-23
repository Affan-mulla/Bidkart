import axiosInstance from "@/api/axiosInstance"

export interface CouponValidateResponse {
  couponId?: string
  discountAmount: number
  finalAmount: number
  couponCode: string
  type: "percentage" | "flat"
  value: number
}

export async function validateCoupon(code: string): Promise<CouponValidateResponse> {
  const response = await axiosInstance.post("/coupons/validate", { code })
  return response.data?.data
}

export async function applyCoupon(couponId: string): Promise<void> {
  await axiosInstance.post("/coupons/apply", { couponId })
}
