import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { forgotPassword } from "@/lib/auth.api"
import { useAuthStore } from "@/store/useAuthStore"

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
})

type ForgotSchema = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [message, setMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotSchema>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true)
      const response = await forgotPassword(values.email)
      setPendingEmail(values.email)
      sessionStorage.setItem("bidkart_pending_email", values.email)
      setIsSuccess(true)
      setMessage(response.message || "Reset code sent. Redirecting...")

      window.setTimeout(() => {
        navigate("/reset-password")
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start reset flow.")
      setIsSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Forgot password</h2>
        <p className="text-sm text-muted-foreground">Enter your email to receive a reset code.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[#9b2c2c] focus-visible:ring-2 focus-visible:ring-[#9b2c2c]/20"
            placeholder="you@example.com"
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        {message ? (
          <div
            className={`rounded-md border p-3 text-xs ${
              isSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message}
          </div>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#9b2c2c] text-white hover:bg-[#7f2323]">
          {isSubmitting ? "Sending code..." : "Send reset code"}
        </Button>
      </form>
    </div>
  )
}
