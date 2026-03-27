import axios from "axios"

type ErrorPayload = {
  message?: string
  error?: string
}

/**
 * Reads backend API error message with a small fallback chain.
 */
export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined
    return payload?.message || payload?.error || fallbackMessage
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage
  }

  return fallbackMessage
}
