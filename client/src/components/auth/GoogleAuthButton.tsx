import { Button } from "@/components/ui/button"

export default function GoogleAuthButton() {
  const handleGoogleAuth = () => {
    const baseUrl = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
    const normalizedBaseUrl = baseUrl.replace(/\/api$/, "")
    window.location.href = `${normalizedBaseUrl}/api/auth/google`
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
      className="h-11 w-full justify-center gap-2 rounded-lg border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.9S6.9 21.2 12 21.2c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3H12z"
        />
      </svg>
      Continue with Google
    </Button>
  )
}
