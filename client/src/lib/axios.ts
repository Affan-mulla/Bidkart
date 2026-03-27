import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { useAuthStore } from "@/store/useAuthStore"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/register/seller",
  "/auth/verify-email",
  "/auth/resend-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
] as const

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const requestUrl = originalRequest?.url ?? ""
    const isRefreshRequest = requestUrl.includes("/auth/refresh-token")
    const shouldSkipRefresh = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) =>
      requestUrl.includes(endpoint),
    )

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshRequest ||
      shouldSkipRefresh
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = refreshClient
          .post("/auth/refresh-token")
          .then((response) => {
            const payload = response.data as { data?: { accessToken?: string } }
            const newToken = payload?.data?.accessToken

            if (!newToken) {
              throw new Error("Missing access token from refresh response")
            }

            useAuthStore.getState().setAccessToken(newToken)
            return newToken
          })
          .finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
      }

      if (!refreshPromise) {
        throw new Error("Refresh promise was not initialized")
      }

      const token = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${token}`
      return api(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(refreshError)
    }
  },
)

export default api
