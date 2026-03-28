import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import GoogleAuthButton from "@/components/auth/GoogleAuthButton"
import PasswordInput from "@/components/auth/PasswordInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { loginUser } from "@/lib/auth.api"
import { extractApiErrorMessage } from "@/lib/apiError"
import { useAuthStore } from "@/store/useAuthStore"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type LoginSchema = z.infer<typeof loginSchema>

const roleRouteMap = {
  buyer: "/",
  seller: "/seller/dashboard",
} as const

export default function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = new URLSearchParams(location.search).get("callbackUrl")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true)
      const { user, accessToken } = await loginUser(values.email, values.password)
      setCredentials(user, accessToken)

      if (callbackUrl) {
        navigate(callbackUrl, { replace: true })
        return
      }

      navigate(roleRouteMap[user.role], { replace: true })
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Unable to log in. Please check your credentials."))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="h-9 bg-white"
            placeholder="you@example.com"
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Link to="/forgot-password" className="text-xs text-[#9b2c2c] hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-9 w-full "  size="lg">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative py-1.5">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs uppercase text-muted-foreground">
          or
        </span>
      </div>

      <GoogleAuthButton />

      <p className="text-center text-sm text-muted-foreground">
        New to BidKart?{" "}
        <Link to="/register" className="font-medium text-[#9b2c2c] hover:underline">
          Create account
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Want to sell on BidKart?{" "}
        <Link to="/register/seller" className="text-[#9b2c2c] hover:underline">
          Create a seller account
        </Link>
      </p>
    </div>
  )
}
