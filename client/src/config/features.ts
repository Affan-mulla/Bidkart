const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) {
    return false
  }

  const normalizedValue = value.trim().toLowerCase()
  return normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes" || normalizedValue === "on"
}

export const isEmailVerificationEnabled = parseBooleanEnv(import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION)
