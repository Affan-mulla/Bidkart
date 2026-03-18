import api from "@/lib/axios"
import type { AuthUser } from "@/store/useAuthStore"

type MessageResponse = {
  message: string
}

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

type LoginResponse = {
  accessToken: string
  user: AuthUser
}

type GetMeResponse = {
  user: AuthUser
}

/**
 * Authenticate a user with email and password.
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<ApiEnvelope<LoginResponse>>("/auth/login", { email, password })
  return response.data.data
}

/**
 * Register a buyer account.
 */
export const registerBuyer = async (
  name: string,
  email: string,
  password: string,
): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/register", { name, email, password })
  return { message: response.data.message }
}

/**
 * Register a seller account.
 */
export const registerSeller = async (
  name: string,
  email: string,
  password: string,
  storeName: string,
  storeDescription: string,
): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/register/seller", {
    name,
    email,
    password,
    storeName,
    storeDescription,
  })
  return { message: response.data.message }
}

/**
 * Verify email with OTP.
 */
export const verifyEmail = async (email: string, otp: string): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/verify-email", { email, otp })
  return { message: response.data.message }
}

/**
 * Request OTP resend for verification or password reset.
 */
export const resendOtp = async (email: string, type: "verify" | "reset"): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/resend-otp", { email, type })
  return { message: response.data.message }
}

/**
 * Request reset password flow.
 */
export const forgotPassword = async (email: string): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/forgot-password", { email })
  return { message: response.data.message }
}

/**
 * Reset password with OTP.
 */
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<MessageResponse> => {
  const response = await api.post<ApiEnvelope<Record<string, never>>>("/auth/reset-password", {
    email,
    otp,
    newPassword,
  })
  return { message: response.data.message }
}

/**
 * Log out authenticated user.
 */
export const logoutUser = async (): Promise<void> => {
  await api.post("/auth/logout")
}

/**
 * Restore current session using cookie refresh flow.
 */
export const getMe = async (): Promise<GetMeResponse> => {
  const response = await api.get<ApiEnvelope<GetMeResponse>>("/auth/me")
  return response.data.data
}
