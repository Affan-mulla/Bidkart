import axiosInstance from "@/api/axiosInstance.ts"

type AuthUser = {
  id?: string
  name?: string
  email?: string
  role?: string
  [key: string]: unknown
}

type AuthResponsePayload = {
  token?: string
  role?: string
  user?: AuthUser
}

export type AuthResponse = {
  message?: string
  data?: AuthResponsePayload
  token?: string
  role?: string
  user?: AuthUser
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export const register = (data: RegisterPayload) =>
  axiosInstance.post<AuthResponse>("/auth/register", data)

export const login = (data: LoginPayload) =>
  axiosInstance.post<AuthResponse>("/auth/login", data)
