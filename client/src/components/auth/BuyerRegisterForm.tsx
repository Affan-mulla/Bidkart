import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import PasswordInput from "@/components/auth/PasswordInput"
import { isEmailVerificationEnabled } from "@/config/features"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { registerBuyer } from "@/lib/auth.api"
import { extractApiErrorMessage } from "@/lib/apiError"
import { useAuthStore } from "@/store/useAuthStore"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

const buyerRegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, "Must contain a letter and a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type BuyerRegisterSchema = z.infer<typeof buyerRegisterSchema>

export default function BuyerRegisterForm() {
  const navigate = useNavigate()
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BuyerRegisterSchema>({
    resolver: zodResolver(buyerRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true)
      await registerBuyer(values.name, values.email, values.password)

      if (isEmailVerificationEnabled) {
        setPendingEmail(values.email)
        sessionStorage.setItem("bidkart_pending_email", values.email)
        navigate("/verify-email")
        return
      }

      toast.success("Account created successfully. You can now log in.")
      navigate("/login", { replace: true })
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Unable to register buyer account right now."))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          {...register("name")}
          className="h-9 bg-white"
          placeholder="John Doe"
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          className="h-9 bg-white"
          placeholder="you@example.com"
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword ? <p className="text-xs text-destructive">{errors.confirmPassword.message}</p> : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full h-9"  size="lg">
        {isSubmitting ? "Creating account..." : "Create buyer account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-[#9b2c2c] hover:underline">
          Log in
        </Link>
      </p>

      <div className="relative py-1">
        <Separator />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Want to sell on BidKart?{" "}
        <Link to="/register/seller" className="text-[#9b2c2c] hover:underline">
          Create a seller account
        </Link>
      </p>
    </form>
  )
}
