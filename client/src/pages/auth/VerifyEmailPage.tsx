import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import OtpInput from "@/components/auth/OtpInput"
import { Button } from "@/components/ui/button"
import { resendOtp, verifyEmail } from "@/lib/auth.api"
import { extractApiErrorMessage } from "@/lib/apiError"
import { useAuthStore } from "@/store/useAuthStore"

const RESEND_WAIT_SECONDS = 60

function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  if (!name || !domain) {
    return email
  }

  const maskedName = `${name[0]}${"*".repeat(Math.max(1, name.length - 1))}`
  return `${maskedName}@${domain}`
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const pendingEmail = useAuthStore((state) => state.pendingEmail)
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)
  const clearPendingEmail = useAuthStore((state) => state.clearPendingEmail)

  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [counter, setCounter] = useState(RESEND_WAIT_SECONDS)
  const hasAutoSubmittedRef = useRef(false)

  useEffect(() => {
    if (!pendingEmail) {
      const cachedEmail = sessionStorage.getItem("bidkart_pending_email")
      if (cachedEmail) {
        setPendingEmail(cachedEmail)
        return
      }

      navigate("/login", { replace: true })
    }
  }, [navigate, pendingEmail, setPendingEmail])

  useEffect(() => {
    if (counter <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setCounter((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [counter])

  const emailToShow = pendingEmail ?? ""

  const canSubmit = otp.length === 6 && !isSubmitting && Boolean(emailToShow)

  const submitVerification = async () => {
    if (!emailToShow || otp.length !== 6 || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      await verifyEmail(emailToShow, otp)
      clearPendingEmail()
      sessionStorage.removeItem("bidkart_pending_email")
      toast.success("Email verified! Please log in.")
      navigate("/login", { replace: true })
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Verification failed."))
      hasAutoSubmittedRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (otp.length === 6 && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true
      void submitVerification()
    }

    if (otp.length < 6) {
      hasAutoSubmittedRef.current = false
    }
  }, [otp])

  const handleResend = async () => {
    if (!emailToShow || counter > 0) {
      return
    }

    try {
      await resendOtp(emailToShow, "verify")
      setCounter(RESEND_WAIT_SECONDS)
      toast.success("A new verification code has been sent.")
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Could not resend OTP."))
    }
  }

  const resendLabel = useMemo(() => {
    if (counter <= 0) {
      return "Resend code"
    }

    return `Resend in ${counter}s`
  }, [counter])

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">Verify your email</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Enter the 6-digit verification code we sent to continue.</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Code sent to <span className="font-medium text-foreground">{maskEmail(emailToShow)}</span>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Verification code</p>
        <OtpInput value={otp} onChange={setOtp} disabled={isSubmitting} />
      </div>

      <Button
        type="button"
        onClick={() => {
          void submitVerification()
        }}
        disabled={!canSubmit}
        className="h-11 w-full bg-[#9b2c2c] text-white hover:bg-[#7f2323]"
      >
        {isSubmitting ? "Verifying..." : "Verify email"}
      </Button>

      <div className="space-y-2">
        <p className="text-center text-xs text-muted-foreground">Didn&apos;t receive a code?</p>
        <Button
          type="button"
          variant="ghost"
          disabled={counter > 0}
          onClick={() => {
            void handleResend()
          }}
          className="w-full text-[#9b2c2c] hover:bg-[#9b2c2c]/10 hover:text-[#9b2c2c]"
        >
          {resendLabel}
        </Button>
      </div>
    </div>
  )
}
