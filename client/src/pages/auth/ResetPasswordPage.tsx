import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import OtpInput from "@/components/auth/OtpInput"
import PasswordInput from "@/components/auth/PasswordInput"
import { Button } from "@/components/ui/button"
import { resendOtp, resetPassword } from "@/lib/auth.api"
import { extractApiErrorMessage } from "@/lib/apiError"
import { useAuthStore } from "@/store/useAuthStore"

const resetSchema = z
  .object({
    otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, "Must contain a letter and a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type ResetSchema = z.infer<typeof resetSchema>

const RESEND_WAIT_SECONDS = 60

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const pendingEmail = useAuthStore((state) => state.pendingEmail)
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)
  const clearPendingEmail = useAuthStore((state) => state.clearPendingEmail)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCounter, setResendCounter] = useState(RESEND_WAIT_SECONDS)

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<ResetSchema>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    if (!pendingEmail) {
      const cachedEmail = sessionStorage.getItem("bidkart_pending_email")
      if (cachedEmail) {
        setPendingEmail(cachedEmail)
        return
      }

      navigate("/forgot-password", { replace: true })
    }
  }, [navigate, pendingEmail, setPendingEmail])

  useEffect(() => {
    if (resendCounter <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setResendCounter((previousCounter) => (previousCounter <= 1 ? 0 : previousCounter - 1))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [resendCounter])

  const otp = watch("otp")

  const onSubmit = handleSubmit(async (values) => {
    if (!pendingEmail) {
      navigate("/forgot-password", { replace: true })
      return
    }

    try {
      setIsSubmitting(true)
      await resetPassword(pendingEmail, values.otp, values.newPassword)
      clearPendingEmail()
      sessionStorage.removeItem("bidkart_pending_email")
      toast.success("Password reset! Please log in.")
      navigate("/login", { replace: true })
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Could not reset password."))
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleResendOtp = async () => {
    if (!pendingEmail || resendCounter > 0) {
      return
    }

    try {
      await resendOtp(pendingEmail, "reset")
      setResendCounter(RESEND_WAIT_SECONDS)
      toast.success("A new reset code has been sent.")
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Could not resend reset code."))
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">Reset password</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Enter your verification code and create a secure new password.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Verification code</label>
          <OtpInput value={otp} onChange={(value) => setValue("otp", value, { shouldValidate: true })} disabled={isSubmitting} />
          {errors.otp ? <p className="text-xs text-destructive">{errors.otp.message}</p> : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          disabled={resendCounter > 0 || isSubmitting || !pendingEmail}
          onClick={() => {
            void handleResendOtp()
          }}
          className="w-full text-[#9b2c2c] hover:bg-[#9b2c2c]/10 hover:text-[#9b2c2c]"
        >
          {resendCounter > 0 ? `Resend code in ${resendCounter}s` : "Resend code"}
        </Button>

        <div className="space-y-2 pt-1">
          <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
            New password
          </label>
          <PasswordInput id="newPassword" autoComplete="new-password" {...register("newPassword")} />
          {errors.newPassword ? <p className="text-xs text-destructive">{errors.newPassword.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword ? <p className="text-xs text-destructive">{errors.confirmPassword.message}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#9b2c2c] text-white hover:bg-[#7f2323]">
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  )
}
